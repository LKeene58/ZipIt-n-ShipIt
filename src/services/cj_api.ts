import 'dotenv/config';
import { auditLog } from 'src/services/logger';

type CjConfig = {
  baseUrl: string;
};

type CjProduct = {
  id: string;
  variantId: string | null;
  name: string;
  description: string;
  imageUrl: string;
  supplierLink: string | null;
  costPrice: number;
  supplierRating: number;
  warehouseCountry: string | null;
};

type CjShippingQuote = {
  shippingCost: number;
  currency: string;
};

// --- AUTONOMOUS TOKEN MANAGER ---
let activeToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getValidToken(): Promise<string | null> {
  if (activeToken && Date.now() < tokenExpiryTime) {
    return activeToken;
  }

  const email = process.env.CJ_EMAIL?.trim();
  const apiKey = process.env.CJ_API_KEY?.trim() ?? process.env.CJ_API_TOKEN?.trim();
  const baseUrl = process.env.CJ_API_BASE_URL?.trim() ?? 'https://developers.cjdropshipping.com/api2.0/v1';

  if (!email || !apiKey) {
    auditLog('Missing Credentials in .env!', 'ERROR', 'cj_api', 'getValidToken');
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: apiKey }),
    });

    const data = await response.json();
    const typedData = data as { code?: number | string; data?: { accessToken?: string } };

    if ((typedData.code === 200 || typedData.code === '200') && typedData.data?.accessToken) {
      activeToken = typedData.data.accessToken;
      tokenExpiryTime = Date.now() + (1000 * 60 * 60 * 2); 
      return activeToken;
    } else {
      auditLog('TICKET BOOTH REJECTED YOUR CREDENTIALS', 'ERROR', 'cj_api', 'getValidToken');
      auditLog(JSON.stringify(data, null, 2), 'RAW', 'cj_api', 'getValidToken');
      return null;
    }
  } catch (error) {
    auditLog(`TICKET BOOTH NETWORK CRASH: ${error}`, 'ERROR', 'cj_api', 'getValidToken');
    return null;
  }
}

function getConfig(): CjConfig {
  const baseUrl = process.env.CJ_API_BASE_URL?.trim() ?? 'https://developers.cjdropshipping.com/api2.0/v1';
  return { baseUrl };
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isUsWarehouse(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return ['us', 'usa', 'united states', 'united-states'].includes(normalized);
}

// --- THE NEW WIRETAPPED REQUESTER ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cjRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const config = getConfig();
  const badge = await getValidToken();
  
  if (!badge) return null; 

  await sleep(1500);

  try {
    const fullUrl = `${config.baseUrl}${path}`;
    const response = await fetch(fullUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': badge,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      auditLog(`WAREHOUSE REJECTED THE BADGE. URL: ${fullUrl} | Status: ${response.status} ${response.statusText}`, 'ERROR', 'cj_api', 'cjRequest');
      auditLog(errorText, 'RAW', 'cj_api', 'cjRequest');
      return null;
    }

    const data = await response.json();

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const safeData = data as Record<string, unknown>;
      if ('code' in safeData && safeData.code !== 200 && safeData.code !== 2000000 && safeData.code !== '200') {
        auditLog('CJ API LOGIC ERROR (Non-200 Code)', 'ERROR', 'cj_api', 'cjRequest');
        auditLog(JSON.stringify(safeData, null, 2), 'RAW', 'cj_api', 'cjRequest');
        return null;
      }
      if ('result' in safeData && safeData.result === false) {
        auditLog('CJ API LOGIC ERROR (Result False)', 'ERROR', 'cj_api', 'cjRequest');
        auditLog(JSON.stringify(safeData, null, 2), 'RAW', 'cj_api', 'cjRequest');
        return null;
      }
    }

    return data as T;
  } catch (error) {
    auditLog(`CJ API CRASH: ${error}`, 'ERROR', 'cj_api', 'cjRequest');
    return null;
  }
}

function parseProductRows(payload: Record<string, unknown>): CjProduct[] {
  const rawRows =
    (Array.isArray(payload.data) && payload.data) ||
    (Array.isArray(payload.result) && payload.result) ||
    (Array.isArray((payload.data as { list?: unknown[] } | undefined)?.list) &&
      (payload.data as { list: unknown[] }).list) ||
    [];

  const rows: CjProduct[] = [];

  for (const raw of rawRows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const id = pickString(row.pid, row.productId, row.id);
    const name = pickString(row.productName, row.name, row.titleEn, row.title);
    if (!id || !name) continue;

    // 🛡️ THE UPGRADED ARRAY WAREHOUSE CHECK
    let strictWarehouse = pickString(
          row.countryCode,
          row.warehouseCountry,
          row.warehouse_country,
          row.warehouse,
          row.stockCountry,
          row.stock_country,
          row.shipFrom,
          row.ship_from,
    );

    // If the standard strings fail, check the newly discovered array format!
    if (!strictWarehouse && Array.isArray(row.shippingCountryCodes) && row.shippingCountryCodes.length > 0) {
        // Grab the first country code in the array
        strictWarehouse = String(row.shippingCountryCodes[0]); 
    }

    rows.push({
      id,
      variantId: pickString(row.vid, row.variantId, row.defaultVariantId) || null,
      name,
      description: pickString(row.description, row.productDesc, row.productDescription),
      imageUrl: pickString(row.productImage, row.image, row.mainImage, row.bigImage),
      supplierLink: pickString(row.productUrl, row.sourceUrl, row.supplierLink) || null,
      costPrice: toNumber(row.sellPrice, toNumber(row.costPrice, 0)),
      supplierRating: toNumber(row.score, toNumber(row.rating, 0)),
      warehouseCountry: strictWarehouse || 'CN', // Guilty until proven US
    });
  }
  return rows;
}

export async function authenticateCj(): Promise<boolean> {
  const token = await getValidToken();
  return Boolean(token);
}

export async function fetchTrendingUSProducts(
  categoryOrKeywords: string | string[],
  limit: number,
): Promise<CjProduct[]> {
  const byId = new Map<string, CjProduct>();
  
  // Convert whatever the Hydrator sends us into an array of keywords
  const keywords = Array.isArray(categoryOrKeywords)
    ? categoryOrKeywords.map(k => k.trim()).filter(Boolean)
    : [categoryOrKeywords.trim()].filter(Boolean);

  if (keywords.length === 0) keywords.push('studio gear');

  auditLog(`Initiating V2 KEYWORD SNIPER for ${keywords.length} terms...`, 'INFO', 'cj_api', 'fetchTrendingUSProducts');

  for (const kw of keywords) {
    auditLog(`Hunting for: "${kw}"`, 'INFO', 'cj_api', 'fetchTrendingUSProducts');
    
    // 🛡️ THE FIX: Strict V2 syntax. 'keyWord' (capital W) and 'size=50' max. No countryCode limit.
    const encoded = encodeURIComponent(kw);
    const apiPath = `/product/listV2?page=1&size=50&keyWord=${encoded}`;
    
    const payload = await cjRequest<Record<string, unknown>>(apiPath);
    
    if (!payload) {
      auditLog(`Payload was null for ${kw}`, 'WARN', 'cj_api', 'fetchTrendingUSProducts');
      continue;
    }

    // Dump raw data to file so we can inspect it if it fails
    auditLog(JSON.stringify(payload, null, 2), 'RAW', 'cj_api', 'fetchTrendingUSProducts');

    const parsed = parseProductRows(payload);
    
    if (parsed.length === 0) {
      auditLog(`0 items found for "${kw}". CJ might not have inventory for this exact term.`, 'WARN', 'cj_api', 'fetchTrendingUSProducts');
      continue;
    }

    const usOnly = parsed.filter(item => isUsWarehouse(item.warehouseCountry));
    auditLog(`"${kw}": Scraped ${parsed.length} global, ${usOnly.length} passed US filter.`, 'SUCCESS', 'cj_api', 'fetchTrendingUSProducts');
    
    for (const item of usOnly) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    
    // Respect the Ticket Booth rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const finalCandidates = Array.from(byId.values()).slice(0, Math.max(1, limit));
  auditLog(`Sniper complete. Yielded ${finalCandidates.length} US creator products.`, 'SUCCESS', 'cj_api', 'fetchTrendingUSProducts');
  
  return finalCandidates;
}

export async function fetchLiveShippingRate(args: {
  productId: string;
  variantId: string | null;
  quantity: number;
  countryCode?: string;
}): Promise<CjShippingQuote | null> {
  const FALLBACK_COST = 10.00; // 👈 Safer $10 margin protector
  const startCountry = args.countryCode || 'US'; 
  
  // 1. If we don't have a variant ID, the API will reject us. Fallback immediately.
  if (!args.variantId) {
    auditLog(`Missing Variant ID for ${args.productId}. Using $${FALLBACK_COST} failsafe.`, 'WARN', 'cj_api', 'fetchLiveShippingRate');
    return { shippingCost: FALLBACK_COST, currency: 'USD' };
  }

  try {
    // 2. Ping the official CJ Freight Calculation endpoint
    const payload = await cjRequest<Record<string, unknown>>('/logistic/freightCalculate', {
      method: 'POST',
      body: JSON.stringify({
        startCountryCode: startCountry,
        endCountryCode: 'US', // We are shipping TO the US
        products: [{ quantity: args.quantity, vid: args.variantId }]
      })
    });

    // 3. Parse the results to find the cheapest real shipping rate
    if (payload && Array.isArray(payload.data) && payload.data.length > 0) {
      const rates: number[] = [];
      
      for (const method of payload.data) {
        const safeMethod = method as Record<string, unknown>;
        const price = Number(safeMethod.logisticPrice || 0);
        if (price > 0) rates.push(price);
      }

      if (rates.length > 0) {
        // Sort lowest to highest and grab the cheapest one
        rates.sort((a, b) => a - b);
        const bestRate = Math.round(rates[0] * 100) / 100;
        auditLog(`Found live shipping rate for ${args.productId}: $${bestRate}`, 'SUCCESS', 'cj_api', 'fetchLiveShippingRate');
        return {
          shippingCost: bestRate, // Round to 2 decimals
          currency: 'USD'
        };
      }
    }

    // 4. Graceful Fallback if the API returned an empty list or invalid data
    auditLog(`No valid shipping routes found for ${args.productId}. Using $${FALLBACK_COST} failsafe.`, 'WARN', 'cj_api', 'fetchLiveShippingRate');
    return { shippingCost: FALLBACK_COST, currency: 'USD' };

  } catch (error) {
    // 5. The Ultimate Failsafe: Never crash the pipeline
    auditLog(`API crashed for ${args.productId}. Silently applying failsafe. Error: ${error}`, 'ERROR', 'cj_api', 'fetchLiveShippingRate');
    return { shippingCost: FALLBACK_COST, currency: 'USD' };
  }
}

export type { CjProduct, CjShippingQuote };