import Link from 'next/link';
import { notFound } from 'next/navigation';

type LegalDocument = {
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const LEGAL_DOCS: Record<string, LegalDocument> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    summary:
      'This policy describes how ZIP-IT \'N SHIP-IT collects, uses, and protects customer data across account, checkout, and support workflows.',
    sections: [
      {
        heading: '1. Data We Collect',
        body: [
          'We collect information required to run the store, including account email, order details, shipping address, and transaction metadata.',
          'Payment data is processed by Stripe. We do not store raw card numbers or card security codes in our systems.',
        ],
      },
      {
        heading: '2. How We Use Data',
        body: [
          'Data is used for account authentication, fraud prevention, order fulfillment, customer support, and operational analytics.',
          'Certain automated systems assist with catalog and logistics operations, but sensitive account security data remains access-restricted.',
        ],
      },
      {
        heading: '3. Third-Party Processing',
        body: [
          'Orders are fulfilled through third-party logistics and supplier partners. Required order and shipping data is shared only to complete fulfillment and delivery.',
          'Sales tax, shipping charges, and final totals are calculated at checkout based on customer location and selected fulfillment options.',
        ],
      },
      {
        heading: '4. Security and Retention',
        body: [
          'We apply role-based access controls, row-level security policies, and credential protections for internal systems.',
          'Data retention periods are based on legal, accounting, and operational requirements.',
        ],
      },
    ],
  },
  'terms-of-service': {
    title: 'Terms of Service',
    summary:
      'These terms govern access to and use of the ZIP-IT \'N SHIP-IT storefront, account features, and checkout services.',
    sections: [
      {
        heading: '1. Account and Security',
        body: [
          'You are responsible for maintaining the confidentiality of your credentials and for activity under your account.',
          'We may suspend or limit access when fraud, abuse, or unauthorized activity is detected.',
        ],
      },
      {
        heading: '2. Product Listings and Availability',
        body: [
          'Product availability and pricing may change without notice. We reserve the right to correct listing errors and cancel invalid orders.',
          'Displayed shipping windows are estimates and depend on carrier performance, inventory source, and fulfillment timing.',
        ],
      },
      {
        heading: '3. Checkout and Charges',
        body: [
          'By placing an order, you authorize payment for the full amount shown at checkout.',
          'Sales tax, shipping, and applicable fees are calculated at checkout before final confirmation.',
        ],
      },
      {
        heading: '4. Third-Party Fulfillment',
        body: [
          'Orders are fulfilled through third-party logistics and supplier networks. Tracking events and delivery times may vary by carrier and region.',
          'We are not responsible for delays caused by customs, weather, carrier exceptions, or force majeure events.',
        ],
      },
    ],
  },
  'refund-policy': {
    title: 'Refund Policy',
    summary:
      'This policy explains refund eligibility, review conditions, and processing timelines for ZIP-IT \'N SHIP-IT orders.',
    sections: [
      {
        heading: '1. Eligibility',
        body: [
          'Refund requests must include order details and a clear reason, such as non-delivery, damaged goods, or incorrect items.',
          'Requests may be denied when the item has been used, altered, or falls outside the stated claim window.',
        ],
      },
      {
        heading: '2. Review Process',
        body: [
          'Each request is reviewed against carrier tracking, fulfillment records, and product condition evidence.',
          'When approved, refunds are issued to the original payment method and may require additional bank processing time.',
        ],
      },
      {
        heading: '3. Logistics and Exceptions',
        body: [
          'Because orders are fulfilled through third-party logistics partners, delays in carrier scans can affect claim timing and resolution.',
          'Shipping costs and taxes shown at checkout may be non-refundable unless required by applicable law.',
        ],
      },
    ],
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    summary:
      'This policy outlines handling, transit expectations, tracking updates, and carrier responsibilities for all shipped orders.',
    sections: [
      {
        heading: '1. Processing and Transit',
        body: [
          'Orders typically begin processing after payment confirmation. Domestic delivery targets are generally 2-5 business days after dispatch.',
          'Transit estimates are not guarantees and may vary by destination, carrier capacity, and seasonal volume.',
        ],
      },
      {
        heading: '2. Cost and Tax Calculation',
        body: [
          'Shipping fees and sales tax are calculated dynamically at checkout based on address, package characteristics, and applicable tax rules.',
          'Final shipping charges are displayed before you complete payment.',
        ],
      },
      {
        heading: '3. Third-Party Fulfillment',
        body: [
          'Orders are fulfilled and shipped through third-party logistics and supplier partners.',
          'Tracking data is posted as soon as carrier information is provided to our platform.',
        ],
      },
      {
        heading: '4. Delivery Issues',
        body: [
          'If tracking indicates delivery but a package is missing, contact support promptly so we can coordinate with the carrier.',
          'Address-entry errors or reroute requests after shipment may cause delays and additional charges.',
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((slug) => ({ slug }));
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];

  if (!doc) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12 text-white">
      <header className="mb-8 rounded-2xl border border-cyan-500/20 bg-black/35 p-6 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">ZIP-IT &apos;N SHIP-IT</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.12em]">{doc.title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/75">{doc.summary}</p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-cyan-400/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
          >
            Return to Home
          </Link>
        </div>
      </header>

      {doc.sections.map((section) => (
        <section
          key={section.heading}
          className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md"
        >
          <h2 className="text-xl font-black uppercase tracking-[0.12em] text-cyan-200">{section.heading}</h2>
          <div className="mt-3 space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-6 text-white/80">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
