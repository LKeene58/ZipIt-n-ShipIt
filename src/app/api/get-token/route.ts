import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function GET() {
  const APP_KEY = process.env.ALIEXPRESS_APP_KEY!;
  const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET!;
  
  // The temporary code you just got from the URL
  const AUTH_CODE = '3_529032_NY2y0EZcI65vJ1By4p66UwDI186'; 

  // AliExpress REST API requires millisecond timestamp for token creation
  const timestamp = Date.now().toString(); 

  const params: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: timestamp,
    sign_method: 'sha256',
    code: AUTH_CODE,
  };

  // 1. Mathematically sign the token request
  const sortedKeys = Object.keys(params).sort();
  
  // ALIBABA QUIRK: Rest APIs require the path at the front of the string
  let signString = '/auth/token/create'; 
  
  for (const key of sortedKeys) {
    signString += `${key}${params[key]}`;
  }
  
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(signString, 'utf8');
  params.sign = hmac.digest('hex').toUpperCase();

  // 2. Fire the exchange request to AliExpress
  try {
    const response = await fetch('https://api-sg.aliexpress.com/rest/auth/token/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: new URLSearchParams(params).toString()
    });

    const data = await response.json();
    return NextResponse.json({ 
      status: "Token Exchange Complete", 
      tokens: data 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}