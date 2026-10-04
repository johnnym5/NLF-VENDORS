-- Manual bank-transfer payment review.
-- Additive migration: existing reservations and payment records are retained.

ALTER TABLE public.booth_reservations
  ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IS NULL OR payment_method IN ('PAYSTACK', 'BANK_TRANSFER'));

CREATE TABLE IF NOT EXISTS public.manual_transfer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL CHECK (length(trim(bank_name)) BETWEEN 2 AND 100),
  account_name TEXT NOT NULL CHECK (length(trim(account_name)) BETWEEN 2 AND 150),
  account_number TEXT NOT NULL CHECK (account_number ~ '^[0-9]{6,20}$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.enforce_manual_transfer_account_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  account_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('manual_transfer_accounts_max_five'));
  SELECT count(*) INTO account_count FROM public.manual_transfer_accounts;
  IF account_count >= 5 THEN
    RAISE EXCEPTION 'A maximum of five manual transfer accounts can be configured.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manual_transfer_account_limit ON public.manual_transfer_accounts;
CREATE TRIGGER manual_transfer_account_limit
  BEFORE INSERT ON public.manual_transfer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_manual_transfer_account_limit();

CREATE TABLE IF NOT EXISTS public.manual_transfer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.booth_reservations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.manual_transfer_accounts(id) ON DELETE SET NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'RECEIVED', 'NOT_RECEIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_transfer_one_processing_per_reservation
  ON public.manual_transfer_submissions(reservation_id)
  WHERE status = 'PROCESSING';

ALTER TABLE public.manual_transfer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_transfer_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manual transfer accounts readable by approved vendors and admins" ON public.manual_transfer_accounts;
CREATE POLICY "Manual transfer accounts readable by approved vendors and admins"
  ON public.manual_transfer_accounts FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.booth_reservations r
      WHERE r.user_id = auth.uid() AND r.status = 'APPROVED_PENDING_PAYMENT'
    )
  );

DROP POLICY IF EXISTS "Admins manage manual transfer accounts" ON public.manual_transfer_accounts;
CREATE POLICY "Admins manage manual transfer accounts"
  ON public.manual_transfer_accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Vendors and admins read manual transfer submissions" ON public.manual_transfer_submissions;
CREATE POLICY "Vendors and admins read manual transfer submissions"
  ON public.manual_transfer_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_manual_transfer(
  p_reservation_id UUID,
  p_bank_account_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID := auth.uid();
  reservation_row public.booth_reservations%ROWTYPE;
  account_row public.manual_transfer_accounts%ROWTYPE;
  submission_id UUID;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before submitting a transfer.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO reservation_row
  FROM public.booth_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR reservation_row.user_id <> actor_id THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF reservation_row.status <> 'APPROVED_PENDING_PAYMENT' THEN
    RAISE EXCEPTION 'This reservation is not awaiting payment.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO account_row
  FROM public.manual_transfer_accounts
  WHERE id = p_bank_account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected bank account is no longer available.' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.manual_transfer_submissions (
    reservation_id, user_id, bank_account_id, bank_name, account_name, account_number, amount
  ) VALUES (
    reservation_row.id, actor_id, account_row.id, account_row.bank_name,
    account_row.account_name, account_row.account_number, reservation_row.total_amount
  ) RETURNING id INTO submission_id;

  RETURN submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_booth_payment(
  p_reservation_id UUID,
  p_payment_reference TEXT,
  p_payment_method TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reservation_row public.booth_reservations%ROWTYPE;
  tier_row public.booth_tiers%ROWTYPE;
  assigned_sequence INTEGER;
BEGIN
  IF p_payment_method = 'PAYSTACK' THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Only the payment verification service may confirm Paystack transactions.' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF p_payment_method = 'BANK_TRANSFER' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator may confirm a bank transfer.' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported payment method.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_payment_reference IS NULL OR length(trim(p_payment_reference)) = 0 THEN
    RAISE EXCEPTION 'A payment reference is required.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO reservation_row
  FROM public.booth_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'no_data_found';
  END IF;
  IF reservation_row.status = 'CONFIRMED_PAID' THEN
    IF reservation_row.payment_reference = p_payment_reference THEN RETURN; END IF;
    RAISE EXCEPTION 'This reservation has already been settled.' USING ERRCODE = 'unique_violation';
  END IF;
  IF reservation_row.status <> 'APPROVED_PENDING_PAYMENT' THEN
    RAISE EXCEPTION 'This reservation is not awaiting payment.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO tier_row
  FROM public.booth_tiers
  WHERE id = reservation_row.tier_id
  FOR UPDATE;
  IF NOT FOUND OR tier_row.stock <= 0 THEN
    RAISE EXCEPTION 'This booth tier has no remaining stock.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.booth_tiers
  SET stock = stock - 1, updated_at = NOW()
  WHERE id = reservation_row.tier_id;

  INSERT INTO public.global_stats (id, total_confirmed_orders)
  VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
  PERFORM 1 FROM public.global_stats WHERE id = 1 FOR UPDATE;
  UPDATE public.global_stats
  SET total_confirmed_orders = COALESCE(total_confirmed_orders, 0) + 1
  WHERE id = 1
  RETURNING total_confirmed_orders INTO assigned_sequence;
  UPDATE public.global_stats SET total_confirmed_orders = assigned_sequence WHERE id = 1;

  UPDATE public.booth_reservations
  SET status = 'CONFIRMED_PAID',
      payment_reference = p_payment_reference,
      payment_method = p_payment_method,
      vendor_sequence = assigned_sequence,
      updated_at = NOW()
  WHERE id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_manual_transfer(
  p_submission_id UUID,
  p_decision TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  submission_row public.manual_transfer_submissions%ROWTYPE;
  manual_reference TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator may review bank transfers.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_decision NOT IN ('RECEIVED', 'WAITING', 'NOT_RECEIVED') THEN
    RAISE EXCEPTION 'Choose Received, Waiting, or Not received.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO submission_row
  FROM public.manual_transfer_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer submission not found.' USING ERRCODE = 'no_data_found';
  END IF;

  IF p_decision = 'WAITING' THEN
    IF submission_row.status <> 'PROCESSING' THEN
      RAISE EXCEPTION 'Only a processing transfer can remain awaiting confirmation.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN 'PROCESSING';
  END IF;

  IF submission_row.status <> 'PROCESSING' THEN
    RAISE EXCEPTION 'This transfer has already been reviewed.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_decision = 'NOT_RECEIVED' THEN
    UPDATE public.manual_transfer_submissions
    SET status = 'NOT_RECEIVED', reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_submission_id;
    RETURN 'NOT_RECEIVED';
  END IF;

  manual_reference := 'MANUAL-' || upper(replace(submission_row.id::TEXT, '-', ''));
  PERFORM public.settle_booth_payment(submission_row.reservation_id, manual_reference, 'BANK_TRANSFER');
  UPDATE public.manual_transfer_submissions
  SET status = 'RECEIVED', reviewed_at = NOW(), reviewed_by = auth.uid()
  WHERE id = p_submission_id;
  RETURN 'RECEIVED';
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_manual_transfer_account_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_manual_transfer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_booth_payment(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_manual_transfer(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_manual_transfer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_booth_payment(UUID, TEXT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_transfer(UUID, TEXT) TO authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_transfer_submissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

