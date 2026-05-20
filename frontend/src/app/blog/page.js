import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2, Clock, Droplets, Search } from 'lucide-react'
import { blogPosts } from '../../lib/blogPosts'
import { MarketingFooter, MarketingHeader } from '../../components/MarketingShell'

export const metadata = {
  title: 'Water Delivery Business Blog',
  description:
    'Detailed guides for water filtration plants and 19 liter bottle delivery businesses covering deliveries, invoices, inventory, payments, and growth.',
  keywords: [
    'water delivery blog',
    'water filtration business tips',
    'water bottle delivery management',
    'customer ledger guide',
    'SightLedger blog',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Sight Ledger Blog | Water Delivery Business Guides',
    description:
      'Detailed guides for water filtration plants and 19 liter bottle delivery businesses covering deliveries, invoices, inventory, payments, and growth.',
    url: 'https://sightledger.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sight Ledger Blog | Water Delivery Business Guides',
    description:
      'Detailed guides for water filtration plants and 19 liter bottle delivery businesses.',
  },
}

export default function BlogIndexPage() {
  const featured = blogPosts[0]
  const rest = blogPosts.slice(1)

  return (
    <main className="min-h-screen bg-[#f7fcff] text-slate-900">
      <MarketingHeader />

      <section className="border-b border-sky-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800">
              <BookOpen size={16} />
              Practical water business guides
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Learn how to run a cleaner, faster water delivery business.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Deep guides for shop owners who manage 19 liter bottle delivery, walk-in refills,
              customer ledgers, inventory, payments, expenses, and monthly invoices.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['Delivery operations', 'Payment recovery', 'Bottle inventory'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-sky-100 bg-[#f7fcff] px-4 py-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 size={17} className="text-sky-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <article className="rounded-[28px] border border-sky-100 bg-[#f7fcff] p-5 shadow-xl shadow-sky-100/70">
            <div className="rounded-2xl bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  Featured
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Clock size={14} /> {featured.readTime}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold leading-tight text-slate-950">
                <Link href={`/blog/${featured.slug}`} className="hover:text-sky-700">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-4 leading-7 text-slate-600">{featured.summary}</p>
              <div className="mt-6 space-y-3">
                {featured.highlights.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-slate-700">
                    <Droplets size={17} className="mt-0.5 shrink-0 text-sky-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link href={`/blog/${featured.slug}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white">
                Read full guide <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Latest articles</h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Built around real problems: credit customers, bottle losses, walk-in sales, rider tracking, and month-end billing.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
            <Search size={16} />
            SEO guides for shop owners
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {rest.map((post) => (
            <article key={post.slug} className="group rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100/70">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{post.category}</span>
                <span>{post.publishedAt}</span>
                <span>{post.readTime}</span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold leading-tight text-slate-950 group-hover:text-sky-700">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{post.summary}</p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                  Read article <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-sky-100 bg-[#eefaff] p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Want to manage these workflows in one dashboard?
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                  Sight Ledger connects customers, deliveries, walk-in refills, bottles, payments, invoices, and reports for daily water shop operations.
                </p>
              </div>
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white">
                View plans <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  )
}
