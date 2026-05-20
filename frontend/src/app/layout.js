import './globals.css'
import { AuthProvider } from '../context/AuthContext'
import Script from 'next/script'

export const metadata = {
  metadataBase: new URL('https://sightledger.com'),
  title: {
    default: 'SightLedger | Water Delivery Management Software',
    template: '%s | Sight Ledger',
  },
  description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
  keywords: [
    'SightLedger',
    'water bottle delivery software',
    'water delivery management software',
    'water filtration business software',
    '19 liter bottle management',
    'Pakistan water delivery management',
    'bottle inventory software',
    'customer ledger software',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SightLedger | Water Delivery Management Software',
    description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
    url: 'https://sightledger.com',
    siteName: 'Sight Ledger',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SightLedger | Water Delivery Management Software',
    description: 'Manage water bottle deliveries, customers, inventory, billing and operations with SightLedger.',
  },
}

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-HL721NFPJ6'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/aquaflow.css" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}
        </Script>
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
