import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { pollAgentHandshake } from '../../../../../units/support/agent-handshake';

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY configuration');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });
}

type FulfillmentItem = {
  name: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
  supplier_link: string | null;
  supplier_cost_cents: number;
};

type ProductCatalogRow = {
  name: string;
  cost_price: number;
  supplier_link: string | null;
};

function getStripeFeeRate() {
  const raw = Number.parseFloat(process.env.STRIPE_FEE_RATE ?? '');
  if (!Number.isFinite(raw) || raw <= 0) return 0.029;
  return raw;
}

function getStripeFixedFeeCents() {
  const raw = Number.parseInt(process.env.STRIPE_FEE_FIXED_CENTS ?? '', 10);
  if (!Number.isFinite(raw) || raw < 0) return 30;
  return raw;
}

function calculateStripeFeeCents(grossAmountCents: number) {
  const variablePortion = Math.round(grossAmountCents * getStripeFeeRate());
  return variablePortion + getStripeFixedFeeCents();
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

async function postgrestWrite(args: {
  supabaseUrl: string;
  serviceKey: string;
  table: string;
  records: Record<string, unknown>[];
  prefer?: string;
  onConflict?: string;
}) {
  const query = args.onConflict ? `?on_conflict=${encodeURIComponent(args.onConflict)}` : '';
  const response = await fetch(`${args.supabaseUrl}/rest/v1/${args.table}${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: args.serviceKey,
      Authorization: `Bearer ${args.serviceKey}`,
      Prefer: args.prefer ?? 'return=minimal',
    },
    body: JSON.stringify(args.records),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}

async function fetchProductCatalog(args: { supabaseUrl: string; serviceKey: string }) {
  const response = await fetch(
    `${args.supabaseUrl}/rest/v1/products?select=name,cost_price,supplier_link&limit=2000`,
    {
      headers: {
        apikey: args.serviceKey,
        Authorization: `Bearer ${args.serviceKey}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) return new Map<string, ProductCatalogRow>();

  const rows = parseJson<ProductCatalogRow[]>(await response.text(), []);
  const catalog = new Map<string, ProductCatalogRow>();
  for (const row of rows) {
    if (!row?.name) continue;
    catalog.set(normalizeName(row.name), {
      name: row.name,
      cost_price: Number(row.cost_price ?? 0),
      supplier_link: row.supplier_link ?? null,
    });
  }

  return catalog;
}

async function upsertOrderCompat(args: {
  supabaseUrl: string;
  serviceKey: string;
  stripeId: string;
  userId: string | null;
  paymentIntentId: string | null;
  customerEmail: string | null;
  totalAmountCents: number;
  feeCollectedCents: number;
  shippingCostCents: number;
  shippingStatus: string;
  currency: string | null;
  lineItemsJson: string;
  trackingNumber: string | null;
}) {
  const modernRecord = {
    stripe_id: args.stripeId,
    user_id: args.userId,
    total_amount: args.totalAmountCents,
    fee_collected: args.feeCollectedCents,
    shipping_cost: args.shippingCostCents,
    shipping_status: args.shippingStatus,
    customer_email: args.customerEmail,
    currency: args.currency,
    line_items_json: args.lineItemsJson,
    product_details: args.lineItemsJson,
    payment_intent_id: args.paymentIntentId,
    tracking_number: args.trackingNumber,
  };

  const modern = await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'orders',
    records: [modernRecord],
    onConflict: 'stripe_id',
    prefer: 'resolution=merge-duplicates,return=minimal',
  });

  if (modern.ok) return;

  const legacyRecord = {
    stripe_session_id: args.stripeId,
    payment_intent_id: args.paymentIntentId,
    customer_email: args.customerEmail,
    amount_total: args.totalAmountCents,
    currency: args.currency,
    status: args.shippingStatus,
    line_items_json: args.lineItemsJson,
    tracking_number: args.trackingNumber,
  };

  await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'orders',
    records: [legacyRecord],
    onConflict: 'stripe_session_id',
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function insertRevenueLog(args: {
  supabaseUrl: string;
  serviceKey: string;
  stripeId: string;
  grossSalesCents: number;
  supplierCostCents: number;
  feeCollectedCents: number;
  netRevenueCents: number;
  currency: string | null;
  detailsJson: string;
}) {
  const modernRecord = {
    stripe_id: args.stripeId,
    gross_sales: args.grossSalesCents,
    supplier_cost: args.supplierCostCents,
    fee_collected: args.feeCollectedCents,
    net_revenue: args.netRevenueCents,
    currency: args.currency,
    details_json: args.detailsJson,
    created_at: new Date().toISOString(),
  };

  const modern = await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'revenue_log',
    records: [modernRecord],
  });

  if (modern.ok) return;

  await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'revenue_log',
    records: [
      {
        stripe_session_id: args.stripeId,
        gross_sales: args.grossSalesCents,
        supplier_cost: args.supplierCostCents,
        fee_collected: args.feeCollectedCents,
        net_revenue: args.netRevenueCents,
        currency: args.currency,
        details_json: args.detailsJson,
        created_at: new Date().toISOString(),
      },
    ],
  });
}

async function insertPurchaseOrder(args: {
  supabaseUrl: string;
  serviceKey: string;
  stripeId: string;
  purchaseOrderJson: string;
  shippingStatus: string;
}) {
  await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'purchase_orders',
    records: [
      {
        stripe_id: args.stripeId,
        status: args.shippingStatus,
        purchase_order_json: args.purchaseOrderJson,
        created_at: new Date().toISOString(),
      },
    ],
  });
}

async function insertFinancialLedger(args: {
  supabaseUrl: string;
  serviceKey: string;
  stripeId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  grossSalesCents: number;
  supplierCostCents: number;
  shippingCostCents: number;
  platformFeeCents: number;
  stripeFeeCents: number;
  netProfitCents: number;
  currency: string | null;
  detailsJson: string;
}) {
  await postgrestWrite({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    table: 'financial_ledger',
    records: [
      {
        stripe_id: args.stripeId,
        payment_intent_id: args.paymentIntentId,
        customer_email: args.customerEmail,
        gross_sales: args.grossSalesCents,
        supplier_cost: args.supplierCostCents,
        shipping_costs: args.shippingCostCents,
        platform_fee: args.platformFeeCents,
        stripe_fees: args.stripeFeeCents,
        net_profit: args.netProfitCents,
        currency: args.currency,
        details_json: args.detailsJson,
        created_at: new Date().toISOString(),
      },
    ],
    onConflict: 'stripe_id',
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function triggerFulfillment(payload: unknown) {
  const webhookUrl = process.env.BUY_NOW_WEBHOOK_URL;
  if (!webhookUrl) return { forwarded: false, trackingNumber: null as string | null };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.BUY_NOW_WEBHOOK_SECRET
        ? { 'x-webhook-secret': process.env.BUY_NOW_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Fulfillment webhook failed with ${response.status}`);
  }

  const data = parseJson<{ tracking_number?: string; trackingNumber?: string }>(
    await response.text(),
    {},
  );
  return {
    forwarded: true,
    trackingNumber: data.tracking_number ?? data.trackingNumber ?? null,
  };
}

function getPaymentIntentId(paymentIntent: string | Stripe.PaymentIntent | null): string | null {
  if (!paymentIntent) return null;
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
}

export async function POST(req: Request) {
  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe is not configured';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await Promise.all([pollAgentHandshake('Logistics'), pollAgentHandshake('Finance')]);
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET configuration' }, { status: 400 });
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature header' }, { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ ok: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    const chargedTotal = session.amount_total ?? 0;

    const metadataChargedSubtotal = Number.parseInt(session.metadata?.charged_subtotal_cents ?? '', 10);
    const metadataRawSubtotal = Number.parseInt(session.metadata?.raw_subtotal_cents ?? '', 10);
    const metadataFeePercent = Number.parseInt(session.metadata?.fee_percent ?? '', 10);

    const computedLineTotal = lineItems.data.reduce((sum, item) => sum + (item.amount_total ?? 0), 0);
    const computedFeeCents = chargedTotal - metadataRawSubtotal;
    const expectedFeeCents = Math.round((metadataRawSubtotal * metadataFeePercent) / 100);

    if (
      !Number.isFinite(metadataChargedSubtotal) ||
      !Number.isFinite(metadataRawSubtotal) ||
      !Number.isFinite(metadataFeePercent) ||
      metadataFeePercent !== 5 ||
      chargedTotal !== computedLineTotal ||
      chargedTotal !== metadataChargedSubtotal ||
      computedFeeCents !== expectedFeeCents
    ) {
      return NextResponse.json(
        {
          error: 'Checkout total verification failed',
          chargedTotal,
          computedLineTotal,
          metadataChargedSubtotal,
          metadataRawSubtotal,
          metadataFeePercent,
          computedFeeCents,
          expectedFeeCents,
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseConfig();
    const productCatalog = supabase ? await fetchProductCatalog(supabase) : new Map<string, ProductCatalogRow>();

    const fulfillmentItems: FulfillmentItem[] = lineItems.data.map((item) => {
      const name = item.description ?? 'Unknown item';
      const quantity = item.quantity ?? 1;
      const row = productCatalog.get(normalizeName(name));
      const lineTotal = item.amount_total ?? 0;
      const unitAmount = quantity > 0 ? Math.round(lineTotal / quantity) : lineTotal;
      const supplierCostCents = toCents(Number(row?.cost_price ?? 0)) * quantity;

      return {
        name,
        quantity,
        unit_amount: unitAmount,
        line_total: lineTotal,
        supplier_link: row?.supplier_link ?? null,
        supplier_cost_cents: supplierCostCents,
      };
    });

    const supplierCostCents = fulfillmentItems.reduce((sum, item) => sum + item.supplier_cost_cents, 0);
    const shippingCostCents = session.total_details?.amount_shipping ?? 0;
    const paymentIntentId = getPaymentIntentId(session.payment_intent);
    const authUserId = session.metadata?.auth_user_id?.trim() || null;
    const feeCollectedCents = expectedFeeCents;
    const stripeFeeCents = calculateStripeFeeCents(chargedTotal);
    const netRevenueCents = chargedTotal - supplierCostCents - feeCollectedCents;
    const netProfitCents = chargedTotal - supplierCostCents - feeCollectedCents - stripeFeeCents;

    const shippingAddress = session.customer_details?.address ?? null;
    const purchaseOrderPayload = {
      source: 'stripe_checkout_session_completed',
      purchase_order_id: `po_${session.id}`,
      stripe_session_id: session.id,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString(),
      customer: {
        email: session.customer_details?.email ?? null,
        name: session.customer_details?.name ?? null,
        phone: session.customer_details?.phone ?? null,
      },
      shipping: {
        name: session.customer_details?.name ?? null,
        address: shippingAddress,
      },
      totals: {
        gross_sales_cents: chargedTotal,
        raw_subtotal_cents: metadataRawSubtotal,
        fee_collected_cents: feeCollectedCents,
      },
      items: fulfillmentItems,
    };

    const { forwarded, trackingNumber } = await triggerFulfillment(purchaseOrderPayload);
    const shippingStatus = forwarded ? 'purchase_order_sent' : 'paid';

    if (supabase) {
      const lineItemsJson = JSON.stringify(fulfillmentItems);
      await upsertOrderCompat({
        supabaseUrl: supabase.supabaseUrl,
        serviceKey: supabase.serviceKey,
        stripeId: session.id,
        userId: authUserId,
        paymentIntentId,
        customerEmail: session.customer_details?.email ?? null,
        totalAmountCents: chargedTotal,
        feeCollectedCents,
        shippingCostCents,
        shippingStatus,
        currency: session.currency ?? null,
        lineItemsJson,
        trackingNumber,
      });

      await insertRevenueLog({
        supabaseUrl: supabase.supabaseUrl,
        serviceKey: supabase.serviceKey,
        stripeId: session.id,
        grossSalesCents: chargedTotal,
        supplierCostCents,
        feeCollectedCents,
        netRevenueCents,
        currency: session.currency ?? null,
        detailsJson: lineItemsJson,
      });

      await insertPurchaseOrder({
        supabaseUrl: supabase.supabaseUrl,
        serviceKey: supabase.serviceKey,
        stripeId: session.id,
        purchaseOrderJson: JSON.stringify(purchaseOrderPayload),
        shippingStatus,
      });

      await insertFinancialLedger({
        supabaseUrl: supabase.supabaseUrl,
        serviceKey: supabase.serviceKey,
        stripeId: session.id,
        paymentIntentId,
        customerEmail: session.customer_details?.email ?? null,
        grossSalesCents: chargedTotal,
        supplierCostCents,
        shippingCostCents,
        platformFeeCents: feeCollectedCents,
        stripeFeeCents,
        netProfitCents,
        currency: session.currency ?? null,
        detailsJson: lineItemsJson,
      });
    }

    return NextResponse.json({
      ok: true,
      forwarded,
      trackingNumber,
      feeCollectedCents,
      stripeFeeCents,
      supplierCostCents,
      netRevenueCents,
      netProfitCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
