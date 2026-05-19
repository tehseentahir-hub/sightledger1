'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Droplets, Eye, EyeOff, ShieldCheck, Store } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginRole = searchParams.get('role') || 'shop_owner'
  const isAdminLogin = loginRole === 'super_admin'

  useEffect(() => {
    if (user) {
      router.replace(user.role === 'super_admin' ? '/admin' : '/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      router.push(result.user?.role === 'super_admin' ? '/admin' : '/dashboard')
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff8ff,transparent_34%),linear-gradient(135deg,#f8fdff,#e6f7fb_48%,#dceef7)] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-[28px] bg-white shadow-2xl border border-sky-100">
        <section className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.38),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(20,184,166,0.28),transparent_28%)]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-cyan-400 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-slate-950" />
              </span>
              <span className="text-2xl font-bold">Sight Ledger</span>
            </Link>
            <h1 className="mt-16 text-4xl font-bold leading-tight">
              One login for daily bottle delivery, payments, invoices, and reports.
            </h1>
            <p className="mt-5 text-white/70 text-lg">
              Built for water filtration and 19 liter bottle businesses that want clean records without registers or Excel sheets.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
              <p className="text-2xl font-bold">100+</p>
              <p className="text-white/60">trusted clients</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
              <p className="text-2xl font-bold">PDF</p>
              <p className="text-white/60">invoices</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
              <p className="text-2xl font-bold">Daily</p>
              <p className="text-white/60">sales insights</p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-sky-500 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </span>
              <span className="text-2xl font-bold text-slate-900">Sight Ledger</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 px-3 py-1 text-sm font-semibold mb-4">
              {isAdminLogin ? <ShieldCheck size={16} /> : <Store size={16} />}
              {isAdminLogin ? 'Super Admin Login' : 'Shop Owner Login'}
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2">
              {isAdminLogin
                ? 'Manage shops, plans, subscriptions, and SaaS account access.'
                : 'Open your shop dashboard to manage customers, deliveries, payments, and invoices.'}
            </p>
          </div>

          {user && (
            <div className="mb-4 rounded-xl bg-blue-50 text-blue-700 text-sm p-3">
              Session found. Redirecting...
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link className="text-sky-700 font-semibold hover:text-sky-900" href={isAdminLogin ? '/login?role=shop_owner' : '/login?role=super_admin'}>
              {isAdminLogin ? 'Go to shop owner login' : 'Go to super admin login'}
            </Link>
            <Link className="text-slate-500 hover:text-slate-900" href="/">
              Back to website
            </Link>
          </div>

        </section>
      </div>
    </main>
  )
}
