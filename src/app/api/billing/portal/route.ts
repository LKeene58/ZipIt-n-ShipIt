import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY configuration');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    const { email } = (await req.json()) as { email?: string };
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase server credentials.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profileRows } = await adminClient
      .from('user_billing_profiles')
      .select('stripe_customer_id')
      .eq('email', normalizedEmail)
      .limit(1);

    let customerId = profileRows?.[0]?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: normalizedEmail });
      customerId = customer.id;

      await adminClient.from('user_billing_profiles').upsert(
        {
          email: normalizedEmail,
          stripe_customer_id: customerId,
        },
        { onConflict: 'email' },
      );
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
