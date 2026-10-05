-- Correct the exhibitor labels and put the original booth catalog under livestock.
-- Seed an independent three-tier commercial vendor catalog; existing vendor tiers
-- are deliberately left editable in the admin dashboard after this one-time seed.

UPDATE public.exhibition_categories
SET name = 'Livestock Booths',
    description = 'Animal exhibition booths for livestock exhibitors.',
    theme = 'peach',
    sort_order = 0,
    updated_at = NOW()
WHERE slug = 'livestock-exhibitors';

UPDATE public.exhibition_categories
SET name = 'Commercial Vendors',
    description = 'Exhibition spaces for food sellers and commercial vendors.',
    theme = 'green',
    sort_order = 1,
    updated_at = NOW()
WHERE slug = 'food-commercial-vendors';

-- The catalog currently shown as Food/Commercial Vendors consists of livestock
-- booth tiers. Reclassify those tiers and their existing reservations together.
UPDATE public.booth_tiers AS t
SET category_id = livestock.id
FROM public.exhibition_categories AS vendors,
     public.exhibition_categories AS livestock
WHERE t.category_id = vendors.id
  AND vendors.slug = 'food-commercial-vendors'
  AND livestock.slug = 'livestock-exhibitors';

UPDATE public.booth_reservations AS r
SET category_id = livestock.id,
    updated_at = NOW()
FROM public.exhibition_categories AS vendors,
     public.exhibition_categories AS livestock
WHERE r.category_id = vendors.id
  AND vendors.slug = 'food-commercial-vendors'
  AND livestock.slug = 'livestock-exhibitors';

-- Create the first commercial vendor packages. Names, prices, stock, dimensions,
-- and benefits can all be edited later in the existing admin tier controls.
INSERT INTO public.booth_tiers (
  id, category_id, name, dimension, "colorCode", price, stock, "initialStock", "isLocked", perks, "updatedAt"
)
SELECT seed.id, category.id, seed.name, seed.dimension, seed.color_code,
       seed.price, seed.stock, seed.stock, FALSE, seed.perks, NOW()
FROM public.exhibition_categories AS category
CROSS JOIN (VALUES
  ('vendor_basic_stall_2026', 'Basic Vendor Stall', '3m × 3m demarcated vendor stall', 'sage', 1500000::numeric, 20, ARRAY['3m × 3m demarcated floor space', 'Basic vendor signage']),
  ('vendor_standard_stall_2026', 'Standard Vendor Pavilion', '6m × 3m covered vendor pavilion', 'champagne', 3000000::numeric, 15, ARRAY['6m × 3m covered pavilion', 'Dedicated power connection', 'Premium vendor signage']),
  ('vendor_premium_stall_2026', 'Premium Vendor Island', '9m × 6m premium vendor island', 'slate', 5000000::numeric, 10, ARRAY['9m × 6m island space', 'Priority location', 'Enhanced branding package'])
) AS seed(id, name, dimension, color_code, price, stock, perks)
WHERE category.slug = 'food-commercial-vendors'
ON CONFLICT (id) DO NOTHING;

-- Keep payment settlement compatible with this project's booth_tiers schema,
-- which has no updated_at column. The reservation still records its update time.
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

  SELECT * INTO reservation_row FROM public.booth_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'no_data_found'; END IF;
  IF reservation_row.status = 'CONFIRMED_PAID' THEN
    IF reservation_row.payment_reference = p_payment_reference THEN RETURN; END IF;
    RAISE EXCEPTION 'This reservation has already been settled.' USING ERRCODE = 'unique_violation';
  END IF;
  IF reservation_row.status <> 'APPROVED_PENDING_PAYMENT' THEN
    RAISE EXCEPTION 'This reservation is not awaiting payment.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO tier_row FROM public.booth_tiers WHERE id = reservation_row.tier_id FOR UPDATE;
  IF NOT FOUND OR tier_row.stock <= 0 THEN
    RAISE EXCEPTION 'This booth tier has no remaining stock.' USING ERRCODE = 'check_violation';
  END IF;
  IF tier_row.category_id <> reservation_row.category_id THEN
    RAISE EXCEPTION 'Reservation category no longer matches its selected tier.' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.booth_tiers SET stock = stock - 1 WHERE id = reservation_row.tier_id;

  INSERT INTO public.exhibition_category_sequences (category_id, last_sequence)
    VALUES (reservation_row.category_id, 0) ON CONFLICT (category_id) DO NOTHING;
  UPDATE public.exhibition_category_sequences
    SET last_sequence = last_sequence + 1
    WHERE category_id = reservation_row.category_id
    RETURNING last_sequence INTO assigned_sequence;

  UPDATE public.booth_reservations
  SET status = 'CONFIRMED_PAID', payment_reference = p_payment_reference,
      payment_method = p_payment_method, vendor_sequence = assigned_sequence, updated_at = NOW()
  WHERE id = p_reservation_id;
END;
$$;

-- Keep category numbering monotonic after moving any existing paid applications.
UPDATE public.exhibition_category_sequences AS sequence
SET last_sequence = GREATEST(
  sequence.last_sequence,
  COALESCE((
    SELECT max(reservation.vendor_sequence)
    FROM public.booth_reservations AS reservation
    WHERE reservation.category_id = sequence.category_id
      AND reservation.status = 'CONFIRMED_PAID'
  ), 0),
  COALESCE((
    SELECT count(*)::integer
    FROM public.booth_reservations AS reservation
    WHERE reservation.category_id = sequence.category_id
      AND reservation.status = 'CONFIRMED_PAID'
  ), 0)
);
