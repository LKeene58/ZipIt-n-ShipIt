-- ============================================================================
-- ZIP-IT 'N SHIP-IT: Final Database Schema (3-Agent Ready)
-- Safe for clean installs and repeat runs.
-- Includes:
--   - products
--   - orders
--   - logistics_intent
--   - inventory_logs
--   - revenue_log
--   - purchase_orders
--   - financial_ledger
-- Plus unique constraints, indexes, grants, and RLS policies.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0) Extensions
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- 1) Helper Trigger for updated_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 2) products (Agent 1: Sourcing + Storefront catalog)
-- Required fields from AI instructions:
--   name, sale_price, image_url, supplier_link, stock_count
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live',
  sourced_by text,
  cj_product_id text,
  cj_variant_id text,
  supplier_rating numeric(4,2),
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  stripe_fee_estimate numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee_estimate numeric(12,2) NOT NULL DEFAULT 0,
  net_profit_estimate numeric(12,2) NOT NULL DEFAULT 0,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text NOT NULL DEFAULT '',
  supplier_link text,
  stock_count integer NOT NULL DEFAULT 0,
  shipping_origin text NOT NULL DEFAULT 'Unknown',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_cost_price_nonnegative CHECK (cost_price >= 0),
  CONSTRAINT products_sale_price_nonnegative CHECK (sale_price >= 0),
  CONSTRAINT products_stock_count_nonnegative CHECK (stock_count >= 0),
  CONSTRAINT products_status_check CHECK (status IN ('live', 'draft', 'pending_review', 'rejected'))
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sourced_by text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_product_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_variant_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_rating numeric(4,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_cost numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_fee_estimate numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS platform_fee_estimate numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS net_profit_estimate numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_link text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_origin text NOT NULL DEFAULT 'Unknown';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_product_name'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT unique_product_name UNIQUE (name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_name_lower_uniq
  ON public.products (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS products_cj_product_id_uniq
  ON public.products (cj_product_id)
  WHERE cj_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS products_stock_count_idx ON public.products (stock_count);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);

DROP TRIGGER IF EXISTS trg_products_set_updated_at ON public.products;
CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 3) orders (Agent 2/3: payment + fulfillment state)
-- Required fields from AI instructions:
--   stripe_id, total_amount, fee_collected, shipping_status
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_id text NOT NULL,
  user_id uuid,
  payment_intent_id text,
  customer_email text,
  total_amount bigint NOT NULL DEFAULT 0,
  fee_collected bigint NOT NULL DEFAULT 0,
  shipping_cost bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  shipping_status text NOT NULL DEFAULT 'pending',
  tracking_number text,
  product_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_total_amount_nonnegative CHECK (total_amount >= 0),
  CONSTRAINT orders_fee_collected_nonnegative CHECK (fee_collected >= 0),
  CONSTRAINT orders_shipping_cost_nonnegative CHECK (shipping_cost >= 0),
  CONSTRAINT orders_product_details_is_array CHECK (jsonb_typeof(product_details) = 'array'),
  CONSTRAINT orders_line_items_json_is_array CHECK (jsonb_typeof(line_items_json) = 'array')
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fee_collected bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost bigint NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_details jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS line_items_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backward-compat columns used by legacy code paths
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_total bigint;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_id_uniq ON public.orders (stripe_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_uniq
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_shipping_status_idx ON public.orders (shipping_status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON public.orders;
CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 4) logistics_intent (Agent 2: pre-checkout intent tracking)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  session_id text NOT NULL,
  geographic_region text NOT NULL DEFAULT 'unknown',
  timezone text,
  customer_email text,
  item_count integer NOT NULL DEFAULT 0,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT logistics_intent_item_count_nonnegative CHECK (item_count >= 0),
  CONSTRAINT logistics_intent_items_json_is_array CHECK (jsonb_typeof(items_json) = 'array')
);

ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS geographic_region text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS item_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS items_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.logistics_intent ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS logistics_intent_created_at_idx ON public.logistics_intent (created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_intent_session_id_idx ON public.logistics_intent (session_id);
CREATE INDEX IF NOT EXISTS logistics_intent_geographic_region_idx ON public.logistics_intent (geographic_region);

-- --------------------------------------------------------------------------
-- 5) inventory_logs (Agent 1 growth loop audit trail)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'supplier_ingest',
  supplier text,
  product_name text NOT NULL,
  supplier_link text,
  stock_count integer NOT NULL DEFAULT 0,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_logs_stock_count_nonnegative CHECK (stock_count >= 0),
  CONSTRAINT inventory_logs_details_json_is_object CHECK (jsonb_typeof(details_json) = 'object')
);

ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'supplier_ingest';
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS supplier_link text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS stock_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS details_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS inventory_logs_created_at_idx ON public.inventory_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_logs_product_name_idx ON public.inventory_logs (product_name);
CREATE INDEX IF NOT EXISTS inventory_logs_supplier_idx ON public.inventory_logs (supplier);

-- --------------------------------------------------------------------------
-- 6) revenue_log (Agent 3: accounting ledger)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_id text NOT NULL,
  gross_sales bigint NOT NULL DEFAULT 0,
  supplier_cost bigint NOT NULL DEFAULT 0,
  fee_collected bigint NOT NULL DEFAULT 0,
  net_revenue bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  details_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_log_gross_sales_nonnegative CHECK (gross_sales >= 0),
  CONSTRAINT revenue_log_supplier_cost_nonnegative CHECK (supplier_cost >= 0),
  CONSTRAINT revenue_log_fee_collected_nonnegative CHECK (fee_collected >= 0),
  CONSTRAINT revenue_log_details_json_is_array CHECK (jsonb_typeof(details_json) = 'array')
);

ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS stripe_id text;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS gross_sales bigint NOT NULL DEFAULT 0;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS supplier_cost bigint NOT NULL DEFAULT 0;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS fee_collected bigint NOT NULL DEFAULT 0;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS net_revenue bigint NOT NULL DEFAULT 0;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS details_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backward-compat column used by legacy code path
ALTER TABLE public.revenue_log ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS revenue_log_stripe_id_uniq ON public.revenue_log (stripe_id);
CREATE UNIQUE INDEX IF NOT EXISTS revenue_log_stripe_session_id_uniq
  ON public.revenue_log (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS revenue_log_created_at_idx ON public.revenue_log (created_at DESC);

-- --------------------------------------------------------------------------
-- 7) purchase_orders (Agent 2: supplier order handoff record)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_id text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  purchase_order_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_json_is_object CHECK (jsonb_typeof(purchase_order_json) = 'object')
);

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS stripe_id text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'created';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS purchase_order_json jsonb;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx ON public.purchase_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_stripe_id_idx ON public.purchase_orders (stripe_id);

-- --------------------------------------------------------------------------
-- 8) financial_ledger (Private admin analytics)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_id text UNIQUE NOT NULL,
  payment_intent_id text,
  customer_email text,
  gross_sales bigint NOT NULL DEFAULT 0,
  supplier_cost bigint NOT NULL DEFAULT 0,
  platform_fee bigint NOT NULL DEFAULT 0,
  stripe_fees bigint NOT NULL DEFAULT 0,
  net_profit bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  details_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_ledger_gross_sales_nonnegative CHECK (gross_sales >= 0),
  CONSTRAINT financial_ledger_supplier_cost_nonnegative CHECK (supplier_cost >= 0),
  CONSTRAINT financial_ledger_platform_fee_nonnegative CHECK (platform_fee >= 0),
  CONSTRAINT financial_ledger_stripe_fees_nonnegative CHECK (stripe_fees >= 0),
  CONSTRAINT financial_ledger_details_json_is_array CHECK (jsonb_typeof(details_json) = 'array')
);

CREATE INDEX IF NOT EXISTS financial_ledger_created_at_idx ON public.financial_ledger (created_at DESC);
CREATE INDEX IF NOT EXISTS financial_ledger_customer_email_idx ON public.financial_ledger (lower(customer_email));

-- --------------------------------------------------------------------------
-- 9) Grants
-- --------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.products TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.logistics_intent TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.revenue_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purchase_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_ledger TO service_role;
GRANT SELECT ON TABLE public.financial_ledger TO authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;

REVOKE ALL ON TABLE public.financial_ledger FROM PUBLIC, anon;

-- --------------------------------------------------------------------------
-- 10) Row Level Security
-- --------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Clear existing policies for deterministic reruns
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "orders_service_role_all" ON public.orders;
DROP POLICY IF EXISTS "orders_user_read_own" ON public.orders;
DROP POLICY IF EXISTS "logistics_intent_service_role_all" ON public.logistics_intent;
DROP POLICY IF EXISTS "inventory_logs_service_role_all" ON public.inventory_logs;
DROP POLICY IF EXISTS "revenue_log_service_role_all" ON public.revenue_log;
DROP POLICY IF EXISTS "purchase_orders_service_role_all" ON public.purchase_orders;
DROP POLICY IF EXISTS "financial_ledger_service_role_all" ON public.financial_ledger;
DROP POLICY IF EXISTS "financial_ledger_admin_select" ON public.financial_ledger;

-- products: public read
CREATE POLICY "products_public_read"
ON public.products
FOR SELECT
TO anon, authenticated
USING (status = 'live');

-- service_role full control policies (explicit even though service_role bypasses RLS)
CREATE POLICY "products_service_role_all"
ON public.products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "orders_service_role_all"
ON public.orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "orders_user_read_own"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "logistics_intent_service_role_all"
ON public.logistics_intent
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "inventory_logs_service_role_all"
ON public.inventory_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "revenue_log_service_role_all"
ON public.revenue_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "purchase_orders_service_role_all"
ON public.purchase_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "financial_ledger_service_role_all"
ON public.financial_ledger
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "financial_ledger_admin_select"
ON public.financial_ledger
FOR SELECT
TO authenticated
USING (
  lower(coalesce(auth.jwt()->>'email', '')) = 'lkeene0430@gmail.com'
);

COMMIT;
