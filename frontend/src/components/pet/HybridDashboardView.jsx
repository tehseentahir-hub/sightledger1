'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowDownUp,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'

import { API_URL } from '../../lib/api'
import { canViewPetFinancials } from '../../lib/businessMode'

const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`
const number = (value) => Number(value || 0).toLocaleString()

function MetricCard({ label, value, sub, icon: Icon, tone = 'blue', href }) {
  const tones = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600',
    slate: 'from-slate-700 to-slate-900',
    red: 'from-red-500 to-rose-600',
  }

  const body = (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-sm`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-white/90">{label}</p>
      {sub && <p className="mt-2 text-xs text-white/75">{sub}</p>}
    </div>
  )

  return href ? <Link href={href}>{body}</Link> : body
}

function MiniChart({ data = [] }) {
  if (!data.length) return <p className="text-sm text-gray-400">No PET sales trend yet.</p>
  const max = Math.max(1, ...data.map((row) => Number(row.sales_qty || 0)))

  return (
    <div className="flex h-28 items-end gap-2">
      {data.map((row, index) => {
        const value = Number(row.sales_qty || 0)
        const height = Math.max(8, (value / max) * 96)
        return (
          <div key={`${row.txn_date}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-lg bg-primary" style={{ height }} />
            <span className="text-[10px] text-gray-400">{String(row.txn_date || '').slice(-2)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function HybridDashboardView({ user }) {
  const [waterData, setWaterData] = useState(null)
  const [petData, setPetData] = useState(null)
  const [shopInfo, setShopInfo] = useState(user)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const showFinancials = canViewPetFinancials(user)

  useEffect(() => {
    loadHybridDashboard()
  }, [])

  const loadHybridDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const [shopRes, waterRes, petRes] = await Promise.all([
        axios.get(`${API_URL}/auth/me`),
        axios.get(`${API_URL}/dashboard`),
        axios.get(`${API_URL}/pet/summary`),
      ])
      setShopInfo(shopRes.data)
      setWaterData(waterRes.data)
      setPetData(petRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load hybrid dashboard right now.')
    }
    setLoading(false)
  }

  const expiryDate = shopInfo?.subscription_expiry ? new Date(shopInfo.subscription_expiry) : null
  const today = new Date()
  const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))) : 0
  const expiryLabel = expiryDate ? expiryDate.toLocaleDateString('en-GB') : 'N/A'

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle size={18} /> Dashboard Error
        </div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Hybrid Business Mode</p>
          <h1 className="text-2xl font-bold text-gray-900">19L Delivery + PET Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Track route deliveries, PET sales, inventory, and staff entries in one workspace.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
          <Calendar className="h-4 w-4" />
          <span>{shopInfo?.subscription_type || 'Plan'}</span>
          <span className="opacity-60">|</span>
          <span>{daysLeft} days left</span>
          <span className="opacity-60">|</span>
          <span>Expires: {expiryLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="19L deliveries today" value={number(waterData?.today_deliveries)} sub={`${number(waterData?.today_bottles)} bottles`} icon={Truck} tone="blue" href="/dashboard/deliveries" />
        <MetricCard label="PET units sold today" value={number(petData?.today_sales_qty)} sub={`${number(petData?.current_stock)} units in stock`} icon={ShoppingCart} tone="green" href="/dashboard/stock" />
        {showFinancials ? (
          <MetricCard label="This month revenue" value={currency(Number(waterData?.monthly_sales || 0) + Number(petData?.month_sales_amount || 0))} sub={`19L ${currency(waterData?.monthly_sales)} | PET ${currency(petData?.month_sales_amount)}`} icon={Wallet} tone="purple" />
        ) : (
          <MetricCard label="This month activity" value={`${number(waterData?.month_bottles)} + ${number(petData?.month_sales_qty)}`} sub="19L bottles + PET units" icon={Package} tone="purple" />
        )}
        <MetricCard label="Low stock PET items" value={number(petData?.low_stock_count)} sub={`${number(waterData?.bottles_outside)} 19L bottles outside`} icon={AlertCircle} tone={Number(petData?.low_stock_count || 0) > 0 ? 'red' : 'amber'} href="/dashboard/items" />
      </div>

      {showFinancials && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Today Cash Collection</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{currency(waterData?.today_collection)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending Payments</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{currency(waterData?.pending_payments)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">PET Month Sales</p>
            <p className="mt-1 text-2xl font-bold text-primary">{currency(petData?.month_sales_amount)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">19L Delivery Snapshot</h2>
              <p className="text-sm text-gray-500">Home, walk-in, bottles outside, and recent route work.</p>
            </div>
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SmallStat label="Walk-in today" value={`${number(waterData?.today_walkins)} visits`} />
            <SmallStat label="Home bottles today" value={number(waterData?.today_home_bottles)} />
            <SmallStat label="Last 7 days bottles" value={number(waterData?.last7_bottles)} />
            <SmallStat label="Bottles outside" value={number(waterData?.bottles_outside)} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">PET Sales Trend</h2>
              <p className="text-sm text-gray-500">Last 7 days PET quantity movement.</p>
            </div>
            <ArrowDownUp className="h-5 w-5 text-primary" />
          </div>
          <MiniChart data={petData?.trend || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Low Stock Watch</h2>
            <Link href="/dashboard/items" className="text-sm text-primary hover:underline">View PET Items</Link>
          </div>
          <div className="space-y-3">
            {(petData?.low_stock_items || []).length ? petData.low_stock_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="font-medium text-gray-900">{item.item_name}</p>
                  <p className="text-xs text-gray-500">{item.size_label} | {item.unit_type}</p>
                </div>
                <span className="font-bold text-red-600">{number(item.current_stock)}</span>
              </div>
            )) : <p className="text-sm text-gray-400">No low stock items right now.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionLink href="/dashboard/customers" label="Add 19L Customer" />
            <ActionLink href="/dashboard/deliveries" label="Record 19L Delivery" />
            <ActionLink href="/dashboard/items" label="Manage PET Items" />
            <ActionLink href="/dashboard/stock" label="Record PET Sale" />
            {showFinancials && <ActionLink href="/dashboard/payments" label="Record Payment" />}
            {showFinancials && <ActionLink href="/dashboard/invoice" label="Generate Invoice" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

function ActionLink({ href, label }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
      {label}
    </Link>
  )
}
