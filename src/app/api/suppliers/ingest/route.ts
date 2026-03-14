import { NextResponse } from 'next/server';
import { toImageCsv } from '../../../../../units/sourcing/imageCsv';
import { overseerQueueFromSourcing } from '../../../../../manager/overseer';

type SupplierRecord = Record<string, unknown>;

type NormalizedProduct = {
  name: string;
  cost_price: number;
  sale_price: number;
  shipping_origin: string;
  image_url: string;
  supplier_link: string | null;
  stock_count: number;
  description: string | null;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeSupplierProduct(row: SupplierRecord): NormalizedProduct | null {
  const name = pickString(row.name, row.title, row.product_name);
  if (!name) return null;

  const cost = toNumber(row.cost_price ?? row.costPrice ?? row.cost ?? row.wholesale_price, 0);
  const sale = toNumber(row.sale_price ?? row.salePrice ?? row.price ?? row.retail_price, cost);

  return {
    name,
    cost_price: cost,
    sale_price: sale,
    shipping_origin: pickString(row.shipping_origin, row.shippingOrigin, row.origin, row.ship_from, row.country) || 'Unknown',
    image_url: toImageCsv(row.image_url ?? row.images ?? row.imageUrls ?? row.gallery ?? row.mainImage ?? row.image),
    supplier_link:
      pickString(
        row.supplier_link,
        row.supplierLink,
        row.supplier_url,
        row.supplierUrl,
        row.product_url,
        row.productUrl,
        row.url,
        row.link,
      ) || null,
    stock_count: Math.max(
      0,
      Math.round(toNumber(row.stock_count ?? row.stockCount ?? row.inventory ?? row.available ?? row.qty, 0)),
    ),
    description: pickString(row.description, row.product_description) || null,
  };
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function insertInventoryLogs(args: {
  supabaseUrl: string;
  serviceKey: string;
  supplier: string;
  products: NormalizedProduct[];
}) {
  const records = args.products.map((product) => ({
    source: 'supplier_ingest',
    supplier: args.supplier,
    product_name: product.name,
    supplier_link: product.supplier_link,
    stock_count: product.stock_count,
    details_json: JSON.stringify({
      sale_price: product.sale_price,
      shipping_origin: product.shipping_origin,
    }),
    created_at: new Date().toISOString(),
  }));

  await fetch(`${args.supabaseUrl}/rest/v1/inventory_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: args.serviceKey,
      Authorization: `Bearer ${args.serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(records),
  });
}

export async function POST(req: Request) {
  try {
    const expectedToken = process.env.SUPPLIER_INGEST_TOKEN;
    if (expectedToken) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (token !== expectedToken) return unauthorized();
    }

    const body = (await req.json()) as { supplier?: string; products?: SupplierRecord[] };
    const records = Array.isArray(body.products) ? body.products : [];
    const mapped = records.map(normalizeSupplierProduct).filter((row): row is NormalizedProduct => row !== null);

    if (mapped.length === 0) {
      return NextResponse.json({ error: 'No valid supplier products found' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required' },
        { status: 500 },
      );
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/products?on_conflict=name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(mapped),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Supabase ingestion failed', details: responseText },
        { status: 502 },
      );
    }

    let parsedResult: unknown = [];
    if (responseText) {
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        parsedResult = responseText;
      }
    }

    await insertInventoryLogs({
      supabaseUrl,
      serviceKey,
      supplier: body.supplier ?? 'unknown',
      products: mapped,
    });

    await overseerQueueFromSourcing(
      mapped.map((product) => ({
        name: product.name,
        sale_price: product.sale_price,
      })),
    );

    return NextResponse.json({
      ok: true,
      supplier: body.supplier ?? 'unknown',
      received: records.length,
      ingested: mapped.length,
      result: parsedResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
