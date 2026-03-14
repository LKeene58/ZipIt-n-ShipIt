import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const ADMIN_EMAIL = 'lkeene0430@gmail.com';

export function isAdminEmail(email: string | null | undefined) {
  return (email ?? '').toLowerCase() === ADMIN_EMAIL;
}

export async function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server components may be unable to set cookies in some render phases.
        }
      },
    },
  });
}

export async function getServerUserEmail() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user?.email?.toLowerCase() ?? null;
}
