import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

type BuyNowItem = {
  id?: number | string;
  name?: string;
  sale_price?: number;
  quantity?: number;
};

type BuyNowRequest = {
  source?: string;
  session_id?: string;
  geographic_region?: string;
  timezone?: string;
  customer?: {
    email?: string;
  };
  items?: BuyNowItem[];
};

function pickRegion(headers: Headers, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim();
  const fromHeaders =
    headers.get('x-vercel-ip-country') ??
    headers.get('cf-ipcountry') ??
    headers.get('x-country-code') ??
    headers.get('x-geo-country');
  if (fromHeaders && fromHeaders.trim()) return fromHeaders.trim();
  return 'unknown';
}

async function logIntent(payload: {
  source: string;
  sessionId: string;
  geographicRegion: string;
  timezone: string | null;
  itemCount: number;
  itemsJson: string;
  customerEmail: string | null;
}) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const record = {
    source: payload.source,
    session_id: payload.sessionId,
    geographic_region: payload.geographicRegion,
    timezone: payload.timezone,
    item_count: payload.itemCount,
    items_json: payload.itemsJson,
    customer_email: payload.customerEmail,
    created_at: new Date().toISOString(),
  };

  await fetch(`${supabaseUrl}/rest/v1/logistics_intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([record]),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuyNowRequest;
    const items = Array.isArray(body.items) ? body.items : [];
    const sessionId = body.session_id?.trim() || crypto.randomUUID();
    const geographicRegion = pickRegion(req.headers, body.geographic_region);
    const timezone = body.timezone?.trim() || null;
    const source = body.source ?? 'unknown';

    const webhookUrl = process.env.BUY_NOW_WEBHOOK_URL;
    const payload = {
      source,
      session_id: sessionId,
      geographic_region: geographicRegion,
      timezone,
      created_at: new Date().toISOString(),
      items: items.map((item) => ({
        id: item.id ?? null,
        name: item.name ?? 'Unknown item',
        sale_price: Number(item.sale_price ?? 0),
        quantity: Number(item.quantity ?? 1),
      })),
    };

    await logIntent({
      source,
      sessionId,
      geographicRegion,
      timezone,
      itemCount: payload.items.length,
      itemsJson: JSON.stringify(payload.items),
      customerEmail: body.customer?.email?.trim() || null,
    });

    if (!webhookUrl) {
      return NextResponse.json({
        ok: true,
        forwarded: false,
        session_id: sessionId,
        geographic_region: geographicRegion,
        reason: 'BUY_NOW_WEBHOOK_URL is not configured',
      });
    }

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
      return NextResponse.json(
        { ok: false, error: `Fulfillment webhook failed with ${response.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      forwarded: true,
      session_id: sessionId,
      geographic_region: geographicRegion,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
