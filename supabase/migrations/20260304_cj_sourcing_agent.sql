BEGIN;

-- --------------------------------------------------------------------------
-- Products enhancements for sourcing agent draft workflow
-- --------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS sourced_by text,
  ADD COLUMN IF NOT EXISTS cj_product_id text,
  ADD COLUMN IF NOT EXISTS cj_variant_id text,
  ADD COLUMN IF NOT EXISTS supplier_rating numeric(4,2),
  ADD COLUMN IF NOT EXISTS shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_estimate numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_estimate numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_profit_estimate numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.products
SET status = 'live'
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_status_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('live', 'draft', 'pending_review', 'rejected'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS products_cj_product_id_uniq
  ON public.products (cj_product_id)
  WHERE cj_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_sourced_by_idx ON public.products (sourced_by);

-- Public storefront should only read live products.
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
ON public.products
FOR SELECT
TO anon, authenticated
USING (status = 'live');

COMMIT;
