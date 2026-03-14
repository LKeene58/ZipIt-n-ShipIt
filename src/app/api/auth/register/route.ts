import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPin } from '../../../../../units/support/pin-security';

type RegisterBody = {
  email?: string;
  password?: string;
  pin?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const pin = body.pin ?? '';

    if (!email || !password || !pin) {
      return NextResponse.json({ error: 'Email, password, and 6-digit PIN are required.' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 6 digits.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase server credentials.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (createError || !created.user) {
      const message = createError?.message ?? 'User creation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const pinHash = await hashPin(pin);
    const { error: securityError } = await adminClient.from('user_security').insert({
      auth_user_id: created.user.id,
      email,
      pin_hash: pinHash,
    });

    if (securityError) {
      return NextResponse.json({ error: securityError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Account created. Check your inbox to verify email.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
