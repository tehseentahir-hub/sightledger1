import Link from 'next/link'
import { ArrowRight, Check, MessageCircle } from 'lucide-react'
import BrandLogo from '../../components/BrandLogo'

const plans = [
  {
    name: '7 Days Free Trial',
    price: 'PKRS 0',
    period: '7 days',
    customers: '100 clients',
    description: 'Best for testing Sight Ledger with your real shop workflow.',
    features: ['Customer management', 'Delivery entries', 'Bottle inventory', 'Basic reports', 'Shop owner dashboard'],
    cta: 'Start free trial',
    highlighted: false
  },
  {
    name: 'Plus',
    price: 'PKRS 1000',
    period: '1 month',
    customers: '200 customers',
    description: 'For small water delivery shops moving away from paper records.',
    features: ['Daily reports', 'Weekly reports', 'Monthly reports', 'Payments ledger', 'PDF invoices'],
    cta: 'Choose Plus',
    highlighted: false
  },
  {
    name: 'Aqua Plus',
    price: 'PKRS 1500',
    period: '1 month',
    customers: '300 customers',
    description: 'For growing shops that need deeper tracking and billing control.',
    features: ['All Plus features', 'Credit customer tracking', 'Partial payments', 'Expense tracking', 'Profit and loss view'],
    cta: 'Choose Aqua Plus',
    highlighted: true
  },
  {
    name: 'Aqua Premium',
    price: 'PKRS 2500',
    period: '1 month',
    customers: '500 customers',
    description: 'For established businesses with higher daily delivery volume.',
    features: ['All Aqua Plus features', 'Advanced reports', 'Cashier access', 'Rider selection', 'Bottle circulation report'],
    cta: 'Choose Premium',
    highlighted: false
  },
  {
    name: 'Aqua Custom Plan',
    price: 'Contact team',
    period: 'Custom',
    customers: 'Custom customer limit',
    description: 'For large shops or multi-branch operations with special workload needs.',
    features: ['Custom limit', 'Custom pricing', 'Priority setup guidance', 'SaaS owner approval', 'Future scaling support'],
    cta: 'Contact us',
    highlighted: false,
    contact: true
  }
]

export const metadata = {
  title: 'Sight Ledger Pricing | Water Bottle Delivery Software Plans',
  description: 'Pricing plans for Sight Ledger water bottle delivery management software, including free trial, Plus, Aqua Plus, Aqua Premium, and custom plans.',
  keywords: [
    'Sight Ledger pricing',
    'water bottle software pricing',
    'water delivery SaaS plans',
  ],
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Sight Ledger Pricing | Water Bottle Delivery Software Plans',
    description: 'Pricing plans for Sight Ledger water bottle delivery management software, including free trial, Plus, Aqua Plus, Aqua Premium, and custom plans.',
    url: 'https://sightledger.com/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sight Ledger Pricing | Water Bottle Delivery Software Plans',
    description: 'Pricing plans for Sight Ledger water bottle delivery management software.',
  },
}

const whatsappHref = 'https://wa.me/923714885437'
const whatsappLabel = 'WhatsApp +92371-4885437'

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fcff,#ffffff)] text-slate-900">
      <header className="border-b border-sky-100 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" variant="header" priority />
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">
              Home
            </Link>
            <Link href="/login?role=shop_owner" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
              Login
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Plans built for water shop owners.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Start with a 7 days free trial, then select the plan that matches your customer volume. Every plan includes the daily tools needed for delivery tracking, bottle management, billing, and reports.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${plan.highlighted ? 'border-sky-500 bg-sky-50 text-slate-900 shadow-lg shadow-sky-100' : 'border-slate-200 bg-white hover:shadow-sky-100'}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-5 rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <div className="min-h-[188px]">
                <p className="text-sm font-semibold text-sky-700">{plan.customers}</p>
                <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="text-3xl font-semibold tracking-tight">{plan.price}</p>
                  <p className="text-sm text-slate-500">{plan.period}</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm">
                    <Check className="text-emerald-600" size={17} />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.contact ? whatsappHref : '/login?role=shop_owner'}
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${plan.highlighted ? 'bg-sky-700 text-white' : 'bg-sky-600 text-white'}`}
              >
                {plan.cta} {plan.contact ? <MessageCircle size={16} /> : <ArrowRight size={16} />}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Need setup help or a custom customer limit?</h2>
              <p className="mt-2 text-slate-600">Contact the Sight Ledger team for plan activation and custom workload setup for your water shop.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="mailto:Hello@Sightledger.com" className="rounded-full border border-slate-200 px-5 py-3 text-center font-semibold text-slate-800">
                Hello@Sightledger.com
              </a>
              <a href={whatsappHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white">
                <MessageCircle size={18} /> {whatsappLabel}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
