import { NextResponse } from 'next/server';
import { scrapeAliExpressIds } from '../../../../_archive/radar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'studio monitor'; 

  try {
    const data = await scrapeAliExpressIds(query);
    return NextResponse.json({ status: "Radar Success", data });
  } catch (error) {
    // 🛡️ Type-safe error handling (No 'any' allowed!)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}