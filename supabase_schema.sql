-- SQL Schema Migration for NLF Vendors (Supabase PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: booth_tiers
CREATE TABLE IF NOT EXISTS public.booth_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dimension TEXT NOT NULL,
  "colorCode" TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INT NOT NULL,
  "initialStock" INT NOT NULL,
  "isLocked" BOOLEAN DEFAULT false,
  perks TEXT[] DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: metadata
CREATE TABLE IF NOT EXISTS public.metadata (
  id TEXT PRIMARY KEY,
  "totalOrders" INT DEFAULT 0
);

-- 3. Table: booth_orders
CREATE TABLE IF NOT EXISTS public.booth_orders (
  "docId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgName" TEXT NOT NULL,
  "contactPerson" TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  sector TEXT NOT NULL,
  website TEXT,
  "businessDescription" TEXT,
  "tierId" TEXT NOT NULL REFERENCES public.booth_tiers(id) ON DELETE CASCADE,
  "tierName" TEXT NOT NULL,
  "pricePaid" NUMERIC NOT NULL,
  "assignedBoothNumber" TEXT DEFAULT 'Pending Assignment',
  "vendorSequence" INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  "paymentReference" TEXT NOT NULL,
  "purchasedAt" TIMESTAMPTZ DEFAULT NOW(),
  "revokedAt" TIMESTAMPTZ,
  "revocationReason" TEXT
);

-- Turn off Row Level Security restriction for public API calls (or allow ALL actions for public / authenticated users)
ALTER TABLE public.booth_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write on booth_tiers" ON public.booth_tiers;
CREATE POLICY "Allow public read and write on booth_tiers" ON public.booth_tiers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on metadata" ON public.metadata;
CREATE POLICY "Allow public read and write on metadata" ON public.metadata FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read and write on booth_orders" ON public.booth_orders;
CREATE POLICY "Allow public read and write on booth_orders" ON public.booth_orders FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_tiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metadata;

-- Seed Initial Stats
INSERT INTO public.metadata (id, "totalOrders") VALUES ('global_stats', 0) ON CONFLICT (id) DO NOTHING;
