BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- Agent workspace queue
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL CHECK (agent_name IN ('Sourcing', 'Logistics', 'Sales')),
  task_description text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
  priority integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- --------------------------------------------------------------------------
-- Overseer + agent execution logs
-- FK: every log can point to a task_queue item
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.task_queue(id) ON DELETE SET NULL,
  agent_name text NOT NULL CHECK (agent_name IN ('Sourcing', 'Logistics', 'Sales', 'Overseer')),
  action_taken text NOT NULL,
  result text NOT NULL CHECK (result IN ('Success', 'Error')),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  overseer_notes text
);

-- --------------------------------------------------------------------------
-- Performance indexes (status/email)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS task_queue_status_idx ON public.task_queue(status);
CREATE INDEX IF NOT EXISTS task_queue_agent_name_idx ON public.task_queue(agent_name);
CREATE INDEX IF NOT EXISTS task_queue_priority_idx ON public.task_queue(priority);
CREATE INDEX IF NOT EXISTS task_queue_created_at_idx ON public.task_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS agent_logs_task_id_idx ON public.agent_logs(task_id);
CREATE INDEX IF NOT EXISTS agent_logs_agent_name_idx ON public.agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS agent_logs_result_idx ON public.agent_logs(result);
CREATE INDEX IF NOT EXISTS agent_logs_timestamp_idx ON public.agent_logs("timestamp" DESC);

-- email-index directive support for existing business queries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    CREATE INDEX IF NOT EXISTS orders_customer_email_idx
      ON public.orders (lower(customer_email));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    CREATE INDEX IF NOT EXISTS admin_users_email_idx
      ON public.admin_users (lower(email));
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Grants
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_logs TO service_role;

-- Optional read for authenticated admin dashboards
GRANT SELECT ON TABLE public.task_queue TO authenticated;
GRANT SELECT ON TABLE public.agent_logs TO authenticated;

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_queue_service_role_all" ON public.task_queue;
DROP POLICY IF EXISTS "agent_logs_service_role_all" ON public.agent_logs;
DROP POLICY IF EXISTS "task_queue_authenticated_read" ON public.task_queue;
DROP POLICY IF EXISTS "agent_logs_authenticated_read" ON public.agent_logs;

CREATE POLICY "task_queue_service_role_all"
ON public.task_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "agent_logs_service_role_all"
ON public.agent_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "task_queue_authenticated_read"
ON public.task_queue
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "agent_logs_authenticated_read"
ON public.agent_logs
FOR SELECT
TO authenticated
USING (true);

COMMIT;
