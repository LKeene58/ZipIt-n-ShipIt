import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runSourcingSprint } from '../../../../../_archive/cj/cj_hydrator';

const ADMIN_EMAIL = 'lkeene0430@gmail.com';

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

type AdminCheck = {
  allowed: boolean;
  reason?: string;
};

async function isAdminRequest(req: Request): Promise<AdminCheck> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { allowed: false, reason: 'missing_server_supabase_env' };
  }

  const token = getBearerToken(req);
  if (token) {
    const authClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await authClient.auth.getUser(token);
    if (!error && data.user) {
      const email = (data.user.email ?? '').toLowerCase();
      if (email === ADMIN_EMAIL) return { allowed: true };
      return { allowed: false, reason: `email_mismatch:${email || 'missing'}` };
    }
  }

  if (!publicAnonKey) {
    return { allowed: false, reason: 'missing_public_anon_key' };
  }

  try {
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
    if (error || !data.user) {
      return {
        allowed: false,
        reason: token
          ? `token_validation_failed:${error?.message ?? 'unknown'}`
          : `cookie_session_validation_failed:${error?.message ?? 'unknown'}`,
      };
    }
    const email = (data.user.email ?? '').toLowerCase();
    if (email !== ADMIN_EMAIL) {
      return { allowed: false, reason: `email_mismatch:${email || 'missing'}` };
    }
    return { allowed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return { allowed: false, reason: `cookie_auth_exception:${message}` };
  }
}

export async function POST(req: Request) {
  const adminCheck = await isAdminRequest(req);
  if (!adminCheck.allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSourcingSprint();
  return NextResponse.json({ ok: true, result });
}
