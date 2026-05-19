import './globals.css'
import { AuthProvider } from '../context/AuthContext'

export const metadata = {
  metadataBase: new URL('https://Sightledger.com'),
  title: {
    default: 'Sight Ledger | Water Bottle Delivery Management Software',
    template: '%s | Sight Ledger',
  },
  description: 'Sight Ledger is a web based management system for water filtration plants and 19 liter bottle delivery businesses in Pakistan. Manage customers, deliveries, bottles, payments, invoices, expenses, subscriptions, and reports.',
  keywords: [
    'Sight Ledger',
    'water bottle delivery software',
    'water filtration business software',
    '19 liter bottle management',
    'Pakistan delivery management',
    'bottle inventory software',
    'customer ledger software',
  ],
  openGraph: {
    title: 'Sight Ledger',
    description: 'Modern web based software for water bottle delivery businesses.',
    url: 'https://Sightledger.com',
    siteName: 'Sight Ledger',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/aquaflow.css" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
