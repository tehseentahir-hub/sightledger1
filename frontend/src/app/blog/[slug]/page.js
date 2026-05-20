import { notFound } from 'next/navigation'
import { blogPosts, getBlogPostBySlug } from '../../../lib/blogPosts'

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

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">
          Published: {post.publishedAt} | Updated: {post.updatedAt}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{post.h1}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{post.description}</p>

        <div className="mt-8 space-y-5">
          {post.content.map((paragraph, idx) => (
            <p key={idx} className="leading-8 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </main>
  )
}
