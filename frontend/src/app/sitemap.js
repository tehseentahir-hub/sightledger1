import { blogPosts } from '../lib/blogPosts'

export default function sitemap() {
  const baseUrl = 'https://sightledger.com'
  const now = new Date()

  const staticRoutes = [
    '',
    '/pricing',
    '/login',
    '/blog',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogRoutes]
}
