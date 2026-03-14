export default function LegalPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12 text-white">
      <header className="mb-8 rounded-2xl border border-cyan-500/20 bg-black/35 p-6 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Zip-It &apos;n Ship-It</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.12em]">Legal Center</h1>
        <p className="mt-3 text-sm text-white/75">
          Core policies for purchases, shipping, data use, and account protections.
        </p>
      </header>

      <section id="privacy" className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
        <h2 className="text-xl font-black uppercase tracking-[0.12em] text-cyan-200">Privacy Policy</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          We collect only required account, checkout, and fulfillment information. Payment details are handled by Stripe,
          and we do not store raw card numbers. Sensitive security data, including transaction PIN hashes, remains restricted.
        </p>
      </section>

      <section id="terms" className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
        <h2 className="text-xl font-black uppercase tracking-[0.12em] text-cyan-200">Terms of Service</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          By using this site, you agree to account security requirements, checkout verification, and fulfillment workflows.
          We may pause or cancel suspicious activity to protect customers and platform integrity.
        </p>
      </section>

      <section id="refund" className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
        <h2 className="text-xl font-black uppercase tracking-[0.12em] text-cyan-200">Refund Policy</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          Refund requests are reviewed based on delivery status, product condition, and reported issue details.
          Approved refunds are returned through the original payment method and may take several business days to post.
        </p>
      </section>

      <section id="shipping" className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
        <h2 className="text-xl font-black uppercase tracking-[0.12em] text-cyan-200">Shipping Policy</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          Most domestic shipments target a 2-5 business day delivery window after order processing.
          Tracking updates are provided as soon as carrier data becomes available.
        </p>
      </section>
    </main>
  );
}
