-- ============================================================================
-- SUPABASE SCHEMA FOR NATIONAL LIVESTOCK FESTIVAL (NLF) VENDOR PORTAL
-- ============================================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('vendor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM (
    'CART',
    'RESERVED_PENDING_APPROVAL',
    'APPROVED_PENDING_PAYMENT',
    'CONFIRMED_PAID',
    'REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'vendor',
  org_name TEXT,
  contact_person TEXT,
  phone TEXT,
  sector TEXT,
  website TEXT,
  business_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOTH TIERS
CREATE TABLE IF NOT EXISTS public.booth_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dimension TEXT NOT NULL,
  color_code TEXT NOT NULL CHECK (color_code IN ('sage', 'champagne', 'slate')),
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock INT NOT NULL CHECK (stock >= 0),
  initial_stock INT NOT NULL CHECK (initial_stock >= 0),
  is_locked BOOLEAN DEFAULT FALSE,
  perks TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOTH RESERVATIONS
CREATE TABLE IF NOT EXISTS public.booth_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.booth_tiers(id),
  tier_name TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  additional_fees NUMERIC DEFAULT 0 CHECK (additional_fees >= 0),
  total_amount NUMERIC GENERATED ALWAYS AS (base_price + additional_fees) STORED,
  status reservation_status NOT NULL DEFAULT 'CART',
  assigned_booth_number TEXT DEFAULT 'Pending Assignment',
  vendor_sequence INT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM REQUESTS
CREATE TABLE IF NOT EXISTS public.custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.booth_reservations(id) ON DELETE CASCADE,
  request_text TEXT NOT NULL,
  additional_fee NUMERIC DEFAULT 0 CHECK (additional_fee >= 0),
  status request_status DEFAULT 'PENDING',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GLOBAL STATS / SEQUENCE COUNTER
CREATE TABLE IF NOT EXISTS public.global_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_confirmed_orders INT DEFAULT 0
);
INSERT INTO public.global_stats (id, total_confirmed_orders) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- RLS & SECURITY DEFINER
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- POLICIES
DROP POLICY IF EXISTS "Public Tiers Read" ON public.booth_tiers;
CREATE POLICY "Public Tiers Read" ON public.booth_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Tiers Write" ON public.booth_tiers;
CREATE POLICY "Admin Tiers Write" ON public.booth_tiers FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Profiles Access" ON public.profiles;
CREATE POLICY "Profiles Access" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles Insert" ON public.profiles;
CREATE POLICY "Profiles Insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles Update" ON public.profiles;
CREATE POLICY "Profiles Update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Reservations Select" ON public.booth_reservations;
CREATE POLICY "Reservations Select" ON public.booth_reservations FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Reservations Insert" ON public.booth_reservations;
CREATE POLICY "Reservations Insert" ON public.booth_reservations FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Reservations Update" ON public.booth_reservations;
CREATE POLICY "Reservations Update" ON public.booth_reservations FOR UPDATE USING ((auth.uid() = user_id AND status = 'CART') OR public.is_admin());

DROP POLICY IF EXISTS "Reservations Delete" ON public.booth_reservations;
CREATE POLICY "Reservations Delete" ON public.booth_reservations FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Custom Requests Select" ON public.custom_requests;
CREATE POLICY "Custom Requests Select" ON public.custom_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.booth_reservations r WHERE r.id = custom_requests.reservation_id AND (r.user_id = auth.uid() OR public.is_admin()))
);

DROP POLICY IF EXISTS "Custom Requests Insert" ON public.custom_requests;
CREATE POLICY "Custom Requests Insert" ON public.custom_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.booth_reservations r WHERE r.id = custom_requests.reservation_id AND (r.user_id = auth.uid() OR public.is_admin()))
);

DROP POLICY IF EXISTS "Admin Custom Requests Write" ON public.custom_requests;
CREATE POLICY "Admin Custom Requests Write" ON public.custom_requests FOR ALL USING (public.is_admin());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_tiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
