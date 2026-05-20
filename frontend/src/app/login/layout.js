export const metadata = {
  title: 'Login | Sight Ledger',
  description:
    'Login to Sight Ledger shop owner or super admin dashboard to manage deliveries, customers, billing, and reports.',
  keywords: ['Sight Ledger login', 'shop owner login', 'super admin login'],
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Login | Sight Ledger',
    description:
      'Login to Sight Ledger shop owner or super admin dashboard to manage deliveries, customers, billing, and reports.',
    url: 'https://sightledger.com/login',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Sight Ledger',
    description: 'Login to Sight Ledger dashboard.',
  },
}

export default function LoginLayout({ children }) {
  return children
}
