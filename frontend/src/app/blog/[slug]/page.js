import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, Clock, Droplets, HelpCircle } from 'lucide-react'
import { blogPosts, getBlogPostBySlug, getRelatedPosts } from '../../../lib/blogPosts'
import { MarketingFooter, MarketingHeader } from '../../../components/MarketingShell'

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }) {
  const post = getBlogPostBySlug(params.slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://sightledger.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default function BlogPostPage({ params }) {
  const post = getBlogPostBySlug(params.slug)
  if (!post) notFound()

  const relatedPosts = getRelatedPosts(post)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `https://sightledger.com/blog/${post.slug}`,
    author: {
      '@type': 'Organization',
      name: 'Sight Ledger',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sight Ledger',
    },
  }

  return (
    <main className="min-h-screen bg-[#f7fcff] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <MarketingHeader />

      <section className="border-b border-sky-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-sky-700">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-sky-700">Blog</Link>
            <span>/</span>
            <span className="text-slate-700">{post.category}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">{post.category}</span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Clock size={16} /> {post.readTime}
                </span>
                <span className="text-slate-500">Updated {post.updatedAt}</span>
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                {post.h1}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{post.description}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {post.highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-sky-100 bg-[#f7fcff] p-4">
                    <CheckCircle2 className="text-sky-600" size={20} />
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-sky-100 bg-[#f7fcff] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">In this guide</h2>
              <div className="mt-4 grid gap-3">
                {post.sections.map((section) => (
                  <a key={section.heading} href={`#${slugify(section.heading)}`} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:text-sky-700">
                    {section.heading}
                  </a>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,760px)_320px] lg:px-8">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="border-l-4 border-sky-500 bg-sky-50 px-5 py-4 text-lg leading-8 text-slate-700">
            {post.summary}
          </p>

          <div className="mt-10 space-y-10">
            {post.sections.map((section) => (
              <section key={section.heading} id={slugify(section.heading)} className="scroll-mt-24">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{section.heading}</h2>
                <div className="mt-4 space-y-5">
                  {section.body.map((paragraph, idx) => (
                    <p key={idx} className="text-[17px] leading-8 text-slate-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-5 grid gap-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 rounded-xl border border-slate-100 bg-[#fbfdff] p-4 text-slate-700">
                        <Droplets size={18} className="mt-0.5 shrink-0 text-sky-600" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-2xl border border-sky-100 bg-[#eefaff] p-6">
            <h2 className="text-2xl font-semibold text-slate-950">How Sight Ledger fits this workflow</h2>
            <p className="mt-3 leading-8 text-slate-700">
              Sight Ledger helps water shops manage customers, deliveries, walk-in refills, inventory, payments,
              invoices, expenses, and reports from one web dashboard. It is designed for shop owners who want
              clear daily records without relying on registers or scattered Excel sheets.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white">
                View pricing <ArrowRight size={16} />
              </Link>
              <Link href="/login?role=shop_owner" className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800">
                Shop owner login
              </Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-5 grid gap-4">
              {post.faq.map((item) => (
                <div key={item.question} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="flex items-start gap-2 font-semibold text-slate-950">
                    <HelpCircle size={18} className="mt-0.5 shrink-0 text-sky-600" />
                    {item.question}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Related guides</h2>
            <div className="mt-4 grid gap-4">
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`} className="rounded-xl border border-slate-100 p-4 hover:border-sky-200 hover:bg-sky-50">
                  <p className="text-xs font-semibold text-sky-700">{related.category}</p>
                  <h3 className="mt-2 font-semibold leading-6 text-slate-950">{related.title}</h3>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-slate-950 p-5 text-white">
            <h2 className="text-xl font-semibold">Ready to replace registers?</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Start with a clean customer ledger, daily delivery tracking, payment records, and PDF invoices.
            </p>
            <Link href="/pricing" className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white">
              See plans <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </section>

      <MarketingFooter />
    </main>
  )
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
