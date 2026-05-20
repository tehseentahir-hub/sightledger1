export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard'],
      },
    ],
    sitemap: 'https://sightledger.com/sitemap.xml',
    host: 'https://sightledger.com',
  }
}
