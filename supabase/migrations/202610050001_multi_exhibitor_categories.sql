-- Category-aware catalogs, reservations, configurable application fields, and permits.
-- Existing exhibitors, tiers, and reservations are assigned to Food/Commercial Vendors.

CREATE TABLE IF NOT EXISTS public.exhibition_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  description TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'neutral' CHECK (theme IN ('peach', 'green', 'neutral')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.exhibition_categories (slug, name, description, theme, sort_order)
VALUES
  ('livestock-exhibitors', 'Livestock Exhibitors', 'Animal exhibition spaces for livestock exhibitors.', 'peach', 0),
  ('food-commercial-vendors', 'Food/Commercial Vendors', 'Exhibition spaces for food sellers and commercial vendors.', 'green', 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  theme = EXCLUDED.theme,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

ALTER TABLE public.booth_tiers ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.booth_reservations ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.booth_reservations ADD COLUMN IF NOT EXISTS application_data JSONB NOT NULL DEFAULT '{}'::jsonb;
DO $$ BEGIN
  ALTER TABLE public.booth_reservations ADD CONSTRAINT booth_reservations_application_data_object
    CHECK (jsonb_typeof(application_data) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.booth_tiers t
SET category_id = c.id
FROM public.exhibition_categories c
WHERE c.slug = 'food-commercial-vendors' AND t.category_id IS NULL;

UPDATE public.booth_reservations r
SET category_id = c.id
FROM public.exhibition_categories c
WHERE c.slug = 'food-commercial-vendors' AND r.category_id IS NULL;

ALTER TABLE public.booth_tiers ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE public.booth_reservations ALTER COLUMN category_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.booth_tiers ADD CONSTRAINT booth_tiers_category_fk
    FOREIGN KEY (category_id) REFERENCES public.exhibition_categories(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.booth_reservations ADD CONSTRAINT booth_reservations_category_fk
    FOREIGN KEY (category_id) REFERENCES public.exhibition_categories(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS booth_tiers_category_idx ON public.booth_tiers(category_id, name);
CREATE INDEX IF NOT EXISTS booth_reservations_category_idx ON public.booth_reservations(category_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exhibition_application_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.exhibition_categories(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'select', 'checkbox', 'date')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, field_key)
);
CREATE INDEX IF NOT EXISTS exhibition_application_fields_category_idx
  ON public.exhibition_application_fields(category_id, active, sort_order);

ALTER TABLE public.exhibition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibition_application_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read active exhibition categories" ON public.exhibition_categories;
CREATE POLICY "Read active exhibition categories" ON public.exhibition_categories
  FOR SELECT TO anon, authenticated USING (
    active OR public.is_admin() OR EXISTS (
      SELECT 1 FROM public.booth_reservations r WHERE r.category_id = exhibition_categories.id AND r.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Admins manage exhibition categories" ON public.exhibition_categories;
CREATE POLICY "Admins manage exhibition categories" ON public.exhibition_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Read active category application fields" ON public.exhibition_application_fields;
CREATE POLICY "Read active category application fields" ON public.exhibition_application_fields
  FOR SELECT TO anon, authenticated USING (
    public.is_admin() OR (active AND EXISTS (
      SELECT 1 FROM public.exhibition_categories c WHERE c.id = category_id AND c.active
    )) OR EXISTS (
      SELECT 1 FROM public.booth_reservations r WHERE r.category_id = exhibition_application_fields.category_id AND r.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Admins manage category application fields" ON public.exhibition_application_fields;
CREATE POLICY "Admins manage category application fields" ON public.exhibition_application_fields
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.assign_reservation_category_from_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tier_category UUID;
  category_is_active BOOLEAN;
  field_row public.exhibition_application_fields%ROWTYPE;
  answer JSONB;
BEGIN
  SELECT t.category_id, c.active INTO tier_category, category_is_active
  FROM public.booth_tiers t
  JOIN public.exhibition_categories c ON c.id = t.category_id
  WHERE t.id = NEW.tier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected tier is not available.' USING ERRCODE = 'no_data_found'; END IF;
  IF NOT category_is_active THEN RAISE EXCEPTION 'This exhibition category is no longer accepting applications.' USING ERRCODE = 'check_violation'; END IF;
  IF NEW.category_id IS NOT NULL AND NEW.category_id <> tier_category THEN
    RAISE EXCEPTION 'Tier and reservation must belong to the same exhibition category.' USING ERRCODE = 'check_violation';
  END IF;
  NEW.category_id := tier_category;
  NEW.application_data := COALESCE(NEW.application_data, '{}'::jsonb);
  FOR field_row IN
    SELECT * FROM public.exhibition_application_fields
    WHERE category_id = tier_category AND active AND required
  LOOP
    answer := NEW.application_data -> field_row.field_key;
    IF answer IS NULL OR answer = 'null'::jsonb OR
       (field_row.field_type = 'checkbox' AND answer <> 'true'::jsonb) OR
       (field_row.field_type = 'select' AND (jsonb_typeof(answer) <> 'string' OR NOT (field_row.options ? (NEW.application_data ->> field_row.field_key)))) OR
       (field_row.field_type = 'number' AND jsonb_typeof(answer) <> 'number') OR
       (field_row.field_type IN ('text', 'textarea', 'date') AND (jsonb_typeof(answer) <> 'string' OR length(trim(NEW.application_data ->> field_row.field_key)) = 0))
    THEN
      RAISE EXCEPTION 'A required answer is missing or invalid: %', field_row.label USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booth_reservation_category_from_tier ON public.booth_reservations;
CREATE TRIGGER booth_reservation_category_from_tier
  BEFORE INSERT ON public.booth_reservations
  FOR EACH ROW EXECUTE FUNCTION public.assign_reservation_category_from_tier();

CREATE TABLE IF NOT EXISTS public.exhibition_category_sequences (
  category_id UUID PRIMARY KEY REFERENCES public.exhibition_categories(id) ON DELETE RESTRICT,
  last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0)
);
ALTER TABLE public.exhibition_category_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.allocate_exhibition_category_sequence(p_category_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE next_value INTEGER;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators may allocate a permit number.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.exhibition_categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'Exhibition category not found.' USING ERRCODE = 'no_data_found';
  END IF;
  INSERT INTO public.exhibition_category_sequences (category_id, last_sequence)
  VALUES (p_category_id, 0) ON CONFLICT (category_id) DO NOTHING;
  UPDATE public.exhibition_category_sequences SET last_sequence = last_sequence + 1
  WHERE category_id = p_category_id RETURNING last_sequence INTO next_value;
  RETURN next_value;
END;
$$;

INSERT INTO public.exhibition_category_sequences (category_id, last_sequence)
SELECT c.id, GREATEST(
  COALESCE((SELECT max(r.vendor_sequence) FROM public.booth_reservations r WHERE r.category_id = c.id AND r.status = 'CONFIRMED_PAID'), 0),
  (SELECT count(*)::integer FROM public.booth_reservations r WHERE r.category_id = c.id AND r.status = 'CONFIRMED_PAID')
)
FROM public.exhibition_categories c
ON CONFLICT (category_id) DO NOTHING;

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
  UPDATE public.booth_tiers SET stock = stock - 1, updated_at = NOW() WHERE id = reservation_row.tier_id;

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

REVOKE ALL ON FUNCTION public.assign_reservation_category_from_tier() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_booth_payment(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_exhibition_category_sequence(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_booth_payment(UUID, TEXT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_exhibition_category_sequence(UUID) TO service_role, authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exhibition_categories;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exhibition_application_fields;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
