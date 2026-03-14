BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- Sensitive user security data (hashed transaction PIN only)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_security_email_idx ON public.user_security (lower(email));

-- --------------------------------------------------------------------------
-- Stripe customer token mapping (no raw card data)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  stripe_customer_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_billing_profiles_email_idx ON public.user_billing_profiles (lower(email));

-- --------------------------------------------------------------------------
-- Private financial analytics ledger (admin-only read via RLS)
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

-- updated_at trigger helper (safe if already exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_security_set_updated_at ON public.user_security;
CREATE TRIGGER trg_user_security_set_updated_at
BEFORE UPDATE ON public.user_security
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_billing_profiles_set_updated_at ON public.user_billing_profiles;
CREATE TRIGGER trg_user_billing_profiles_set_updated_at
BEFORE UPDATE ON public.user_billing_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Lock down table access
-- --------------------------------------------------------------------------
REVOKE ALL ON TABLE public.user_security FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_billing_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.financial_ledger FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_security TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_billing_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_ledger TO service_role;
GRANT SELECT ON TABLE public.financial_ledger TO authenticated;

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_security_service_role_all" ON public.user_security;
CREATE POLICY "user_security_service_role_all"
ON public.user_security
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "user_billing_profiles_service_role_all" ON public.user_billing_profiles;
CREATE POLICY "user_billing_profiles_service_role_all"
ON public.user_billing_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "financial_ledger_service_role_all" ON public.financial_ledger;
CREATE POLICY "financial_ledger_service_role_all"
ON public.financial_ledger
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "financial_ledger_admin_select" ON public.financial_ledger;
CREATE POLICY "financial_ledger_admin_select"
ON public.financial_ledger
FOR SELECT
TO authenticated
USING (
  lower(coalesce(auth.jwt()->>'email', '')) = 'lkeene0430@gmail.com'
);

COMMIT;
