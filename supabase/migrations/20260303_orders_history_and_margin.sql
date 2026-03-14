BEGIN;

-- --------------------------------------------------------------------------
-- Orders table compatibility for secure per-user purchase history + margin math
-- --------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS product_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_cost bigint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_product_details_is_array'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_product_details_is_array CHECK (jsonb_typeof(product_details) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_shipping_cost_nonnegative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_cost_nonnegative CHECK (shipping_cost >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_desc_idx ON public.orders (created_at DESC);

-- --------------------------------------------------------------------------
-- Authenticated users can only read their own order history
-- --------------------------------------------------------------------------
GRANT SELECT ON TABLE public.orders TO authenticated;

DROP POLICY IF EXISTS "orders_user_read_own" ON public.orders;
CREATE POLICY "orders_user_read_own"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMIT;
