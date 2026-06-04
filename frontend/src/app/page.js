import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, CreditCard, FileText, MessageCircle, ShieldCheck, Smartphone, Star, Truck, Users } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

export const metadata = {
  title: 'SightLedger | Water Delivery Management Software',
  description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
  keywords: [
    'water delivery management software',
    'water bottle delivery software',
    'water filtration business software',
    'SightLedger',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SightLedger | Water Delivery Management Software',
    description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
    url: 'https://sightledger.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SightLedger | Water Delivery Management Software',
    description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
  },
}

const features = [
  { icon: Users, title: 'Customer Ledger', text: 'Customer profiles, bottle rates, deposits, credit status, and outstanding balances in one place.' },
  { icon: Truck, title: 'Delivery Control', text: 'Daily home delivery and walk-in refill records with rider tracking and bottle balance.' },
  { icon: CreditCard, title: 'Payments & Credit', text: 'Cash, credit, advance payments, partial payments, and monthly customer billing.' },
  { icon: FileText, title: 'PDF Invoices', text: 'Professional monthly invoices with delivered bottles, paid amount, and remaining balance.' },
  { icon: BarChart3, title: 'Business Reports', text: 'Daily, weekly, monthly, profit, expense, bottle circulation, and pending payment reports.' },
  { icon: Smartphone, title: 'Mobile First', text: 'Designed for quick entry and daily tracking directly from phone or desktop.' },
]

const testimonials = [
  {
    name: 'Ahmed Water Supply',
    city: 'Lahore',
    quote: 'Sight Ledger helped us stop using registers for deliveries and credit customers. Monthly billing is much easier now.'
  },
  {
    name: 'Pure Drop Filtration',
    city: 'Karachi',
    quote: 'We can see bottle balance, pending payments, and daily refill records from mobile. It feels made for our business.'
  },
  {
    name: 'Blue Spring Water',
    city: 'Islamabad',
    quote: 'The cashier records the work and the owner checks reports later. This simple workflow saved us a lot of confusion.'
  }
]

const metrics = [
  ['100+', 'trusted clients'],
  ['PKRS', 'payment ledgers'],
  ['PDF', 'monthly invoices'],
]

const whatsappHref = 'https://wa.me/923714885437'
const whatsappLabel = 'WhatsApp +92371-4885437'

export default function HomePage() {
  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sight Ledger',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://sightledger.com',
    description:
      'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
      description: '7 days free trial for up to 100 customers',
    },
  }

  return (
    <main className="min-h-screen bg-[#f7fcff] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" variant="header" priority />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-sky-700">Features</a>
            <a href="#reviews" className="hover:text-sky-700">Reviews</a>
            <Link href="/pricing" className="hover:text-sky-700">Pricing</Link>
            <Link href="/blog" className="hover:text-sky-700">Blog</Link>
            <a href="#contact" className="hover:text-sky-700">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login?role=shop_owner" className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 sm:inline-flex">
              Login
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-100">
              Start free <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#ffffff_0%,#ffffff_56%,#eef9ff_56%,#f7fcff_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:min-h-[650px] lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 font-medium text-sky-800">
                <CheckCircle2 size={16} />
                Trusted by 100+ clients
              </span>
              <span className="text-slate-400">Water bottle business software</span>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-slate-950 sm:text-5xl lg:text-[58px]">
              Clean records for every bottle, payment, and delivery.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Sight Ledger helps 19 liter water bottle and filtration businesses replace registers and Excel with a simple web dashboard for customers, deliveries, invoices, expenses, and reports.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?role=shop_owner" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-100">
                Shop Owner Login <ArrowRight size={18} />
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:border-sky-200 hover:bg-sky-50">
                View Pricing
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              {metrics.map(([value, label]) => (
                <div key={label} className="border-l border-sky-100 pl-4 first:border-l-0 first:pl-0">
                  <p className="text-2xl font-semibold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-6 top-10 hidden h-36 w-36 rounded-full bg-cyan-100/70 blur-3xl lg:block" />
            <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-2xl shadow-sky-100">
              <div className="rounded-[20px] border border-slate-100 bg-[#fbfdff] p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-sm text-slate-500">Live business snapshot</p>
                    <p className="text-xl font-semibold text-slate-950">Al-Noor Water Shop</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ['Deliveries', '148', 'Today'],
                    ['Walk-in Refills', '37', 'Today'],
                    ['Pending Payments', 'PKRS 82k', 'Current'],
                    ['Bottles Outside', '426', 'Active']
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">What shop owners track daily</p>
                  </div>
                  {[
                    'Home delivery records by customer and date',
                    'Credit customer pending and advance balances',
                    'Monthly PDF invoices and quick payment updates'
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                      <p className="text-sm text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Everything your daily shop work needs.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            The system is built for shop owners who want fast daily entry, clear billing, and reliable reports without manual registers.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-sky-100 bg-[#eefaff] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Simple workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              From delivery entry to monthly invoice in minutes.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['01', 'Add customers and default bottle rates.'],
              ['02', 'Record home delivery or walk-in refill.'],
              ['03', 'Collect payment and download invoice.']
            ].map(([step, text]) => (
              <div key={step} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-sky-700">{step}</p>
                <p className="mt-5 leading-7 text-slate-700">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Reviews</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Trusted by growing water businesses.</h2>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-2 font-semibold text-sky-700">
            See pricing <ArrowRight size={17} />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((review) => (
            <figure key={review.name} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck size={14} /> Client Verified
                </span>
                <div className="flex items-center gap-1 text-amber-500" aria-label="5 star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={15} fill="currentColor" />
                  ))}
                </div>
              </div>
              <blockquote className="leading-7 text-slate-700">"{review.quote}"</blockquote>
              <figcaption className="mt-5 border-t border-slate-100 pt-4">
                <p className="font-semibold text-slate-950">{review.name}</p>
                <p className="text-sm text-slate-500">{review.city}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="contact" className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[28px] border border-sky-100 bg-[#f3fbff] px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Contact</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Ready to organize your water bottle business?</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Pick your plan and start managing customers, deliveries, bottles, invoices, and payments from one clean dashboard.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:Hello@Sightledger.com" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm">
                Hello@Sightledger.com
              </a>
              <a href={whatsappHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">
                <MessageCircle size={18} /> {whatsappLabel}
              </a>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Start your account</h3>
            <p className="mt-2 text-slate-600">Shop owners can sign in to access their dashboard and daily records.</p>
            <div className="mt-5 grid gap-3">
              <Link href="/login?role=shop_owner" className="flex items-center justify-between rounded-xl border border-slate-200 p-4 font-semibold hover:border-sky-300 hover:bg-sky-50">
                <span className="flex items-center gap-3"><Smartphone size={20} /> Shop Owner Login</span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/pricing" className="flex items-center justify-between rounded-xl border border-slate-200 p-4 font-semibold hover:border-sky-300 hover:bg-sky-50">
                <span className="flex items-center gap-3"><CreditCard size={20} /> Explore Pricing Plans</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>(c) 2026 Sight Ledger. Water bottle delivery management software.</p>
          <p>Sightledger.com</p>
        </div>
      </footer>
    </main>
  )
}
