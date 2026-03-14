import { NextResponse } from 'next/server';
import { searchAliExpressProducts } from '@archive/aliexpress_api'; 

export async function GET(request: Request) {
  // Grab the search query from the URL, default to "XLR Microphone" if none provided
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'XLR Microphone';

  try {
    console.log(`🚀 Firing test search for: ${query}`);
    const data = await searchAliExpressProducts(query);
    
    return NextResponse.json({ 
      status: "success", 
      target: query, 
      results: data 
    });

  } catch (error) {
    console.error("❌ Test Route Error:", error);
    
    // Check if it's a standard JS Error object to safely grab the message
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    return NextResponse.json({ 
      status: "error", 
      message: errorMessage 
    }, { status: 500 });
  }
}