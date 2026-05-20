import Link from 'next/link'
import { blogPosts } from '../../lib/blogPosts'

export const metadata = {
  title: 'Blog',
  description:
    'Guides and practical tips for water filtration plants and 19 liter bottle delivery businesses in Pakistan.',
  keywords: [
    'water delivery blog',
    'water filtration business tips',
    'SightLedger blog',
    '19 liter bottle business',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Sight Ledger Blog',
    description:
      'Guides and practical tips for water filtration plants and 19 liter bottle delivery businesses in Pakistan.',
    url: 'https://sightledger.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sight Ledger Blog',
    description:
      'Guides and practical tips for water filtration plants and 19 liter bottle delivery businesses in Pakistan.',
  },
}

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-[#f7fcff] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Sight Ledger Blog</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Learn practical strategies for customer management, bottle inventory control, payment recovery, and daily delivery operations.
        </p>

        <div className="mt-10 space-y-5">
          {blogPosts.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{post.publishedAt}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                <Link href={`/blog/${post.slug}`} className="hover:text-sky-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 leading-7 text-slate-600">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="mt-4 inline-block font-semibold text-sky-700">
                Read article
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
