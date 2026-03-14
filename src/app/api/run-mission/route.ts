import { NextResponse } from 'next/server';
import { runSourcingMission } from '../../../../_archive/radar';

// Tells Next.js not to cache this so it runs fresh every time
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // We pass a dummy keyword here just to keep the function happy, 
    // since our current API #3 spark plug is hardcoded to category 15 anyway.
    const products = await runSourcingMission("trending");
    
    return NextResponse.json({ 
      status: "Mission Accomplished", 
      total_pulled: products.length, 
      products 
    });
  } catch (error) {
    // Strict TypeScript error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}