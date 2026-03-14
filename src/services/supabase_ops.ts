import { createClient } from '@supabase/supabase-js';

export interface SourcedProduct {
  product_id: string;
  title: string;
  price: number;
  stock: number;
  image_url: string;
  shipping_cost: string | number;
  status: string;
}

// Ensure this file only runs on the server side (Next.js protection)
import 'server-only'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("❌ Missing Supabase URL or Service Role Key in environment variables.");
}

// Initialized with Service Role Key for admin backend access
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Injects products into Supabase using batched upserts.
 */
export async function injectProductsToSupabase(products: SourcedProduct[]) {
  if (!products || products.length === 0) {
    console.warn("⚠️ No products provided to inject.");
    return { success: 0, failed: 0 };
  }

  // 1. RUNTIME SCRUB: Remove any items missing a product_id to prevent database crashes
  const validProducts = products.filter(p => p && p.product_id);
  const droppedCount = products.length - validProducts.length;
  if (droppedCount > 0) {
    console.warn(`⚠️ Scrubbed ${droppedCount} corrupted products before injection.`);
  }

  // 2. PAYLOAD CHUNKING: Split into batches of 500 to prevent timeout/payload limits
  const BATCH_SIZE = 500;
  let totalInjected = 0;
  let totalFailed = 0;

  console.log(`🚀 Starting injection of ${validProducts.length} valid products...`);

  for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
    const batch = validProducts.slice(i, i + BATCH_SIZE);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .upsert(batch, { onConflict: 'product_id' })
        .select();

      if (error) {
        throw new Error(`Supabase Error ${error.code}: ${error.message}`);
      }

      totalInjected += data?.length || 0;
      console.log(`✅ Batch ${i / BATCH_SIZE + 1} complete: Injected ${data?.length} items.`);
      
    } catch (error: unknown) {
      // 3. ISOLATED ERRORS: Strictly typed error handling without 'any'
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Batch %d Failed:', Math.floor(i / BATCH_SIZE) + 1, errorMessage);
      totalFailed += batch.length;
    }
  }

  console.log(`🏁 Injection Run Finished. Success: ${totalInjected} | Failed: ${totalFailed}`);
  return { success: totalInjected, failed: totalFailed };
}