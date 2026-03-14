import { NextResponse } from 'next/server';
import { overseerHandleShippingDelay } from '../../../../../manager/overseer';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      event_type?: string;
      order_id?: string;
      reason?: string;
      eta_days?: number;
    };

    if (body.event_type !== 'shipping_delay') {
      return NextResponse.json({ error: 'Unsupported event_type' }, { status: 400 });
    }

    if (!body.order_id || !body.reason) {
      return NextResponse.json({ error: 'order_id and reason are required' }, { status: 400 });
    }

    const result = await overseerHandleShippingDelay({
      order_id: body.order_id,
      reason: body.reason,
      eta_days: body.eta_days,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({ ok: true, orchestrated: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
