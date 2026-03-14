import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyPin } from '../../../../units/support/pin-security';
import { pollAgentHandshake } from '../../../../units/support/agent-handshake';

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY configuration');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });
}

interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url: string;
  quantity: number;
}

interface CheckoutRequestBody {
  items: Product[];
  email: string;
  pin: string;
}

type FinanceProductRow = {
  id: number;
  sale_price: number | null;
  cost_price: number | null;
  shipping_cost: number | null;
  stripe_fee_estimate: number | null;
  platform_fee_estimate: number | null;
  net_profit_estimate: number | null;
  status: string | null;
};

const PROFIT_FEE_MULTIPLIER = 1.05;

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function validateFinanceGuardrail(adminClient: SupabaseClient, items: Product[]) {
  const ids = Array.from(new Set(items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id))));
  if (ids.length === 0) return { ok: false, reason: 'No valid product IDs in checkout payload.' };

  const { data, error } = await adminClient
    .from('products')
    .select(
      'id,sale_price,cost_price,shipping_cost,stripe_fee_estimate,platform_fee_estimate,net_profit_estimate,status',
    )
    .in('id', ids);

  if (error || !Array.isArray(data)) {
    return { ok: false, reason: 'Finance validation failed while loading product guards.' };
  }

  const byId = new Map<number, FinanceProductRow>(
    (data as FinanceProductRow[]).map((row) => [Number(row.id), row]),
  );

  for (const item of items) {
    const row = byId.get(Number(item.id));
    if (!row) {
      return { ok: false, reason: `Finance validation missing for item ${item.name}.` };
    }

    const salePrice = Number(row.sale_price ?? item.sale_price ?? 0);
    const platformFeeEstimate = Number(row.platform_fee_estimate ?? 0);
    const netProfitEstimate = Number(row.net_profit_estimate ?? 0);
    const expectedPlatformFee = round2(salePrice * 0.05);
    const status = String(row.status ?? '').toLowerCase();

    if (status === 'rejected') {
      return { ok: false, reason: `Finance rejected ${item.name} for checkout.` };
    }

    if (platformFeeEstimate + 0.01 < expectedPlatformFee || netProfitEstimate <= 0) {
      return {
        ok: false,
        reason: `Finance guardrail blocked ${item.name}: 5% Profit Shield not validated.`,
      };
    }
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    await Promise.all([pollAgentHandshake('Sales'), pollAgentHandshake('Finance')]);
    const body = (await req.json()) as CheckoutRequestBody;
    const items: Product[] = Array.isArray(body.items) ? body.items : [];
    const email = (body.email ?? '').trim().toLowerCase();
    const pin = (body.pin ?? '').trim();

    if (!email || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Valid email and 6-digit PIN are required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Missing Supabase server credentials.' }, { status: 500 });
    }

    const token = getBearerToken(req);
    let authUserId: string | null = null;
    if (token) {
      const authClient = createClient(supabaseUrl, anonKey);
      const { data: authData, error: authError } = await authClient.auth.getUser(token);
      if (authError || !authData.user) {
        return NextResponse.json({ error: 'Unauthorized checkout session.' }, { status: 401 });
      }
      const authEmail = authData.user.email?.trim().toLowerCase();
      if (!authEmail || authEmail !== email) {
        return NextResponse.json({ error: 'Checkout email does not match active session.' }, { status: 403 });
      }
      authUserId = authData.user.id;
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const financeValidation = await validateFinanceGuardrail(adminClient, items);
    if (!financeValidation.ok) {
      return NextResponse.json({ error: financeValidation.reason }, { status: 412 });
    }

    const { data: userSecurityRows, error: userSecurityError } = await adminClient
      .from('user_security')
      .select('pin_hash')
      .eq('email', email)
      .limit(1);

    if (userSecurityError || !userSecurityRows?.[0]?.pin_hash) {
      return NextResponse.json({ error: 'PIN verification failed.' }, { status: 401 });
    }

    const validPin = await verifyPin(pin, String(userSecurityRows[0].pin_hash));
    if (!validPin) {
      return NextResponse.json({ error: 'PIN verification failed.' }, { status: 401 });
    }

    const rawSubtotal = items.reduce((total, item) => total + item.sale_price * item.quantity, 0);
    const chargedSubtotal = items.reduce(
      (total, item) => total + Math.round(item.sale_price * PROFIT_FEE_MULTIPLIER * 100) * item.quantity,
      0,
    );

    const { data: billingRows } = await adminClient
      .from('user_billing_profiles')
      .select('stripe_customer_id')
      .eq('email', email)
      .limit(1);

    let customerId = billingRows?.[0]?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      await adminClient.from('user_billing_profiles').upsert(
        {
          email,
          stripe_customer_id: customerId,
        },
        { onConflict: 'email' },
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: items.map((item: Product) => {
        const priceWithFee = item.sale_price * PROFIT_FEE_MULTIPLIER;

        return {
          price_data: {
            currency: 'usd',
            product_data: { 
              name: item.name,
              description: 'Verified High-Performance Gear',
            },
            unit_amount: Math.round(priceWithFee * 100), 
          },
          quantity: item.quantity,
        };
      }),
      metadata: {
        raw_subtotal_cents: Math.round(rawSubtotal * 100).toString(),
        charged_subtotal_cents: chargedSubtotal.toString(),
        fee_percent: '5',
        customer_email: email,
        auth_user_id: authUserId ?? '',
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      phone_number_collection: {
        enabled: true,
      },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      mode: 'payment',
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      success_url: `${req.headers.get('origin')}/success`,
      cancel_url: `${req.headers.get('origin')}/checkout`,
    });

    return NextResponse.json({ sessionId: session.id, checkoutUrl: session.url });
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Stripe Error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
