import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const salvagedIds = [
  "3256809548757506", "3256807349261547", "3256806779852222", "3256807885772471", 
  "3256809974925050", "3256809876690589", "3256807293811848", "3256806050527854", 
  "3256807544773264", "3256804246372014", "3256809548327073", "3256807351855126", 
  "3256805938620491", "3256804566236186", "3256805222238267", "3256810606219112", 
  "3256805723150100", "3256804356550767", "3256808237171322", "3256805089136989", 
  "2255801137146231", "3256810504714448", "3256806583363191", "3256810392379582", 
  "3256805299636681", "3256809379658584", "3256811411272826", "3256808851004753", 
  "3256807619215239", "3256810363362359","3256806810019973", "3256805150056215", "3256805903719802", "3256806547983655",
  "3256806596480070", "3256807448794587", "3256804851793665", "3256806910539912",
  "3256809177710582", "3256806536715050", "3256811593368960", "3256806810237531",
  "3256806808509623", "3256806744483200", "2251832807807626", "3256810104971278",
  "3256806808369038", "3256810350374440", "3256806853097909", "3256805852032966",
  "3256809476029829", "3256810308067432", "3256806718165155", "3256809769025226",
  "3256807158693219", "3256805900535354", "3256805852004191", "3256805852173341",
  "3256810386293209", "3256809915890134", "3256806674544516", "3256806797208000",
  "3256807270756803"
];

async function runSalvage() {
  console.log(`🚀 Starting emergency salvage of ${salvagedIds.length} items...`);

  const products = salvagedIds.map(id => ({
    id: BigInt(id),
    name: `RECOVERED: ${id}`,
    status: 'draft',
    sale_price: 0,
    cost_price: 0,
    net_profit_estimate: 0, // 👈 Corrected
    shipping_cost: 0,
    image_url: '',
    stock_count: 0,        // 👈 Corrected
    in_stock: true         // 👈 Confirmed
  }));

  const safePayload = JSON.parse(JSON.stringify(products, (k, v) => 
    typeof v === 'bigint' ? v.toString() : v
  ));

  const { error } = await supabase.from('products').upsert(safePayload, { onConflict: 'id' });

  if (error) console.error("❌ UPLOAD FAILED:", error.message);
  else console.log(`✅ SUCCESS: ${salvagedIds.length} units are LIVE.`);
}

runSalvage();