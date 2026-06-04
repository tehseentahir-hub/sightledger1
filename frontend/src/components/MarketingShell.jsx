import Link from 'next/link'
import { ArrowRight, Mail, MessageCircle } from 'lucide-react'
import BrandLogo from './BrandLogo'

const whatsappHref = 'https://wa.me/923714885437'
const whatsappLabel = 'WhatsApp +92371-4885437'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" variant="header" priority />

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="hover:text-sky-700">Features</Link>
          <Link href="/pricing" className="hover:text-sky-700">Pricing</Link>
          <Link href="/blog" className="hover:text-sky-700">Blog</Link>
          <Link href="/#contact" className="hover:text-sky-700">Contact</Link>
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
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <BrandLogo href="/" variant="footer" />
          <p className="mt-4 max-w-md leading-7 text-slate-600">
            Web based management software for water filtration plants and 19 liter bottle delivery businesses.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Explore</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <Link href="/" className="hover:text-sky-700">Home</Link>
            <Link href="/pricing" className="hover:text-sky-700">Pricing</Link>
            <Link href="/blog" className="hover:text-sky-700">Blog</Link>
            <Link href="/login?role=shop_owner" className="hover:text-sky-700">Shop Owner Login</Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Contact</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <a href="mailto:Hello@Sightledger.com" className="inline-flex items-center gap-2 hover:text-sky-700">
              <Mail size={16} /> Hello@Sightledger.com
            </a>
            <a href={whatsappHref} className="inline-flex items-center gap-2 hover:text-sky-700">
              <MessageCircle size={16} /> {whatsappLabel}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-5 text-center text-sm text-slate-500">
        (c) 2026 Sight Ledger. Built for water bottle delivery operations.
      </div>
    </footer>
  )
}
