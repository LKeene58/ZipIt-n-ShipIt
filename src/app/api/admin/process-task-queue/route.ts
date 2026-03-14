import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runModularAgentProcessor } from '../../../../../manager/modular-agent-system';

const ADMIN_EMAIL = 'lkeene0430@gmail.com';

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

async function isAdminRequest(req: Request): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) return false;

  const token = getBearerToken(req);
  if (token) {
    const authClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await authClient.auth.getUser(token);
    if (!error && data.user) {
      return (data.user.email ?? '').toLowerCase() === ADMIN_EMAIL;
    }
  }

  if (!publicAnonKey) return false;
  const cookieStore = await cookies();
  const serverClient = createServerClient(supabaseUrl, publicAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op in route handler for auth read.
      },
    },
  });
  const { data, error } = await serverClient.auth.getUser();
  if (error || !data.user) return false;
  return (data.user.email ?? '').toLowerCase() === ADMIN_EMAIL;
}

type Body = {
  limit?: number;
  agent?: string;
};

export async function POST(req: Request) {
  const allowed = await isAdminRequest(req);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // Body is optional.
  }

  const result = await runModularAgentProcessor({
    limit: body.limit,
    agent: body.agent,
  });

  return NextResponse.json({ ok: true, result });
}

// simple status check – allows callers to ping the endpoint without
// triggering a processor run.  Mirrors the admin guard used by POST.
export async function GET(req: Request) {
  const allowed = await isAdminRequest(req);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ status: 'ready' });
}
