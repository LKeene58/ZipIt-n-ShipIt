import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION & ENVIRONMENT ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 
const CJ_API_URL = process.env.CJ_API_URL || 'https://developers.cjdropshipping.com/api2.0/v1';
const CJ_API_KEY = process.env.CJ_API_KEY || 'fake_dev_key';

const POLLING_INTERVAL_MS = 60 * 1000; // 60 seconds
const FETCH_TIMEOUT_MS = 15000; // 15 second limit on all outside API calls
const isDevMode = CJ_API_KEY === 'fake_dev_key';

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Utility: Sleep function to prevent API Rate Limit bans
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility: Safe JSON parser for bad gateway HTML pages and Ghost Arrays
async function safeJsonParse(response: Response) {
  try { 
    const data = await response.json(); 
    if (Array.isArray(data)) return null; // Trap the Ghost Array crash
    return data;
  } catch { 
    return null; 
  }
}

// Utility: Fetch with strict timeout to prevent infinite hangs
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch{
    clearTimeout(id);
    throw new Error(`Fetch timed out or failed: ${url}`);
  }
}

class LogisticsAgent {
  private agentName = 'Logistics_Alpha';
  private isRunning = false;
  private cycleCount = 0;

  public start() {
    console.log(`[${this.agentName}] Booting up. Connecting to Supabase and CJ Dropshipping...`);
    if (isDevMode) console.log(`[${this.agentName}] WARNING: Running in DEV MOCK mode. No real orders will be placed.`);
    
    this.logToOverseer('Agent Online. Logistics monitoring active.');
    this.runCycle();
  }

  private async runCycle() {
    if (this.isRunning) return; 
    this.isRunning = true;
    this.cycleCount++;

    console.log(`\n--- [${this.agentName}] Starting Fulfillment Cycle #${this.cycleCount} ---`);
    
    try {
      await this.processPendingOrders();
      await this.checkTrackingForProcessingOrders();

      // Sync Inventory (Only run every 60 cycles / approx 1 hour)
      if (this.cycleCount % 60 === 1) {
        await this.syncInventory();
      }
    } catch (error) {
console.error('[%s] CRITICAL ERROR in cycle:', this.agentName, error);      this.logToOverseer(`Cycle Failure: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      this.isRunning = false;
      setTimeout(() => this.runCycle(), POLLING_INTERVAL_MS);
    }
  }

  // ==========================================
  // TASK 1: THE GUARD (PAGINATED & SORTED Inventory Sync)
  // ==========================================
  private async syncInventory() {
    console.log(`[${this.agentName}] Syncing inventory levels from CJ Dropshipping...`);
    
    let hasMore = true;
    let offset = 0;
    const limit = 100; 

    while (hasMore) {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, sku, in_stock')
        .order('id', { ascending: true }) 
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Failed to fetch products page', error);
        break;
      }

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      for (const product of products) {
        try {
          const response = await fetchWithTimeout(`${CJ_API_URL}/stock?sku=${product.sku}`, {
            headers: { 'Authorization': `Bearer ${CJ_API_KEY}` }
          });
          
          const rawData = await safeJsonParse(response);
          
          const quantity = rawData?.quantity;
          const isCurrentlyOutOfStock = typeof quantity !== 'number' || quantity <= 0;

          if (isCurrentlyOutOfStock && product.in_stock === true) {
            await supabase.from('products').update({ in_stock: false }).eq('id', product.id);
            this.logToOverseer(`ALERT: SKU ${product.sku} is out of stock at CJ. Storefront updated to SOLD OUT.`);
          } 
          else if (!isCurrentlyOutOfStock && product.in_stock === false) {
            await supabase.from('products').update({ in_stock: true }).eq('id', product.id);
            this.logToOverseer(`RECOVERY: SKU ${product.sku} is back in stock at CJ. Storefront updated to ACTIVE.`);
          }

          await sleep(500); 
        } catch  {
          console.error(`Failed to sync SKU: ${product.sku}`);
        }
      }
      
      offset += limit;
    }
  }

  // ==========================================
  // TASK 2: THE HANDOFF (ATOMIC LOCKING & DOUBLE-SPEND PROTECTION)
  // ==========================================
  private async processPendingOrders() {
    console.log(`[${this.agentName}] Scanning for 'pending' orders...`);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .limit(50);

    if (error || !orders || orders.length === 0) return;

    for (const order of orders) {
      try {
        console.log(`[${this.agentName}] Processing Order #${order.id}...`);
        
        const { data: lockedOrder, error: lockError } = await supabase
          .from('orders')
          .update({ status: 'processing_initiated' })
          .eq('id', order.id)
          .eq('status', 'pending')
          .select('id');

        if (lockError || !lockedOrder || lockedOrder.length === 0) {
          console.log(`[${this.agentName}] Order #${order.id} locked by another process. Skipping.`);
          continue; 
        }

        // SECURITY PATCH 1: Prevent massive payload injection attacks
        const addressString = JSON.stringify(order.shipping_address);
        if (addressString && addressString.length > 2000) {
           console.error(`[${this.agentName}] ALERT: Order #${order.id} shipping address payload is suspiciously large. Flagging.`);
           await supabase.from('orders').update({ status: 'action_required' }).eq('id', order.id);
           continue; // Skip processing this order
        }

        const payload = {
          order_id: order.id,
          shipping_address: order.shipping_address,
          items: order.items 
        };

        const response = await fetchWithTimeout(`${CJ_API_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CJ_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok || isDevMode) { 
          await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id);
          this.logToOverseer(`Successfully relayed Order #${order.id} to CJ Dropshipping.`);
        } else {
          const errorText = await response.text();
          
          // SECURITY PATCH 2: Scrub the API key out of the error logs just in case CJ echoes it
          const sanitizedError = errorText.replace(new RegExp(CJ_API_KEY, 'g'), '[REDACTED_API_KEY]');
          
          console.error('CJ API Rejected Order #%s. Response: %s', order.id, sanitizedError);
          
          await supabase.from('orders').update({ status: 'action_required' }).eq('id', order.id);
          this.logToOverseer(`URGENT: Order #${order.id} rejected. Reason: ${sanitizedError.substring(0, 100)}...`);
        }

        await sleep(500);
      } catch (err) {
        console.error('[%s] Network/API failure on order #%s:', this.agentName, order.id, err);
        await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
      }
    }
  }

  // ==========================================
  // TASK 3: THE WATCHER (Tracking)
  // ==========================================
  private async checkTrackingForProcessingOrders() {
    console.log(`[${this.agentName}] Checking tracking for 'processing' orders...`);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'processing')
      .limit(50);

    if (error || !orders || orders.length === 0) return;

    for (const order of orders) {
      try {
        const response = await fetchWithTimeout(`${CJ_API_URL}/tracking?order_id=${order.id}`, {
          headers: { 'Authorization': `Bearer ${CJ_API_KEY}` }
        });

        const trackingData = await safeJsonParse(response);
        const isShipped = trackingData ? trackingData.shipped : (isDevMode && Math.random() > 0.8); 
        const trackingNumber = trackingData ? trackingData.tracking_number : `1Z9999999999999${order.id}`;

        if (isShipped) {
          await supabase
            .from('orders')
            .update({ 
              status: 'shipped', 
              tracking_number: trackingNumber 
            })
            .eq('id', order.id);
            
          console.log(`[${this.agentName}] Order #${order.id} shipped! Tracking: ${trackingNumber}`);
          this.logToOverseer(`Order #${order.id} shipped. Tracking secured.`);
        }

        await sleep(500);
      } catch (err) {
        console.error(`[${this.agentName}] Failed to check tracking for order #${order.id}`);
      }
    }
  }

  // ==========================================
  // TELEMETRY
  // ==========================================
  private async logToOverseer(message: string) {
    try {
      await supabase.from('overseer_logs').insert({
        agent: this.agentName,
        action: message,
        status: 'success'
      });
    } catch {
      // Silent fail
    }
  }
}

// --- GLOBAL FAILSAFES FOR DOCKER DAEMON ---
process.on('uncaughtException', (error) => {
  console.error('[CRITICAL] Uncaught Exception intercepted. Agent refusing to die:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Promise Rejection intercepted. Agent refusing to die:', reason);
});

// Ignite
const agent = new LogisticsAgent();
agent.start();