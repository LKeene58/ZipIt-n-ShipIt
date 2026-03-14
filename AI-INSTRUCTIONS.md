🛠️ Codex Implementation Checklist: AI Agent Logic
CORE DIRECTIVE: THE "VISUAL LOCK"
DO NOT TOUCH any CSS, Tailwind classes, or layout components related to logos, images, or branding.

PRESERVE the BlueChromeWordmark scaling (scale-[3.5]), positioning (mb-8), and the glowing horizontal line floor.

MAINTAIN the mounted state logic and dangerouslySetInnerHTML watermark killer to prevent hydration and syntax errors.

1. AGENT 1: SOURCING (AliExpress & Global Supply)
Automate Data Population: Structure the sourcing agent to scrape or fetch equipment data (Music/Streaming gear) directly from AliExpress and other global distributors.

Dynamic Upsert: Logic must check for new products and "upsert" them into the Supabase products table without duplicating existing entries.

Growth Loop: Program the agent to continuously scan for trending production gear and add at least 5-10 new SKUs to the site weekly to ensure the inventory is always growing.

2. AGENT 2: LOGISTICS (Intent & Fulfillment)
Intent Tracking: Refine the notifyBuyNow hook to log specific user metadata (session ID, geographic region) into a logistics_intent table.

Supplier Trigger: On successful Stripe payment, the agent must automatically generate a purchase order to the relevant AliExpress supplier with the customer's shipping details.

3. AGENT 3: SALES (Revenue & Profit Protection)
Fee Verification: Strictly enforce the 5% Profit Protection Fee verification logic within the Stripe webhook.

Accounting Ledger: Ensure every successful transaction is recorded in a revenue_log that calculates gross sales minus the supplier cost and the 5% fee.

4. DATABASE ARCHITECTURE
Table Synchronization: Ensure the following schema is fully operational:

products: Name, sale_price, image_url, supplier_link, stock_count.

orders: Stripe_id, total_amount, fee_collected, shipping_status.

inventory_logs: Track automated additions from the Sourcing Agent.

5. INTEGRATION & COMMUNICATION TESTING
Conduct end-to-end testing of the AI communication loop to verify that the Sourcing, Logistics, and Sales agents are exchanging data correctly.

Validate the AliExpress-to-Supabase pipeline by checking that new product entries from the Sourcing agent are correctly formatted and appear in the UI without visual distortion.

Verify the Buy Now-to-Stripe handoff ensuring that purchase intent metadata is passed to the logistics agent and that the 5% Profit Protection Fee is accurately calculated during checkout.

Perform stress tests on the growth loop logic to ensure that adding a high volume of new SKUs does not cause performance lag or database connection timeouts.