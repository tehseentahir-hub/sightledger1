'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { AlertTriangle, ArrowDownUp, Boxes, Package, ShoppingCart, TrendingUp } from 'lucide-react'

import { API_URL, getRequestErrorMessage } from '../../lib/api'
import { canViewPetFinancials } from '../../lib/businessMode'

const number = (value) => Number(value || 0).toLocaleString()
const money = (value) => `Rs ${Number(value || 0).toLocaleString()}`

function MetricCard({ label, value, sub, tone = 'blue', icon: Icon }) {
  const tones = {
    blue: 'from-blue-500 to-sky-500',
    green: 'from-emerald-500 to-green-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-purple-500',
    slate: 'from-slate-700 to-slate-900',
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-lg`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-sm text-white/80">{sub}</p>}
    </div>
  )
}

function QtyTrendChart({ rows = [] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">No bottle sales trend yet.</p>
  }

  const max = Math.max(1, ...rows.map((row) => Number(row.sales_qty || 0)))
  const width = Math.max(360, rows.length * 56)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 180`} className="h-52 w-full min-w-[360px]">
        {rows.map((row, index) => {
          const value = Number(row.sales_qty || 0)
          const barHeight = Math.max(6, (value / max) * 110)
          const x = index * 56 + 16
          const label = String(row.txn_date || '').slice(-2)
          return (
            <g key={`${row.txn_date}-${index}`}>
              <rect x={x} y={138 - barHeight} width="26" height={barHeight} rx="6" fill="#0ea5e9" />
              <text x={x + 13} y={128 - barHeight} textAnchor="middle" fontSize="10" fill="#0f172a">{value}</text>
              <text x={x + 13} y="160" textAnchor="middle" fontSize="10" fill="#64748b">{label || '-'}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function PetDashboardView({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const showFinancials = canViewPetFinancials(user)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API_URL}/pet/summary`)
      setData(res.data)
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Unable to load packaged bottle dashboard right now.'))
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
        <p className="font-semibold">Dashboard Error</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Packaged Bottle Business</p>
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track empty bottle stock, filled bottle sales, invoices, and low stock products.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/items" className="btn btn-secondary">Manage Products</Link>
          <Link href="/dashboard/stock" className="btn btn-primary">Record Sale</Link>
        </div>
      </div>

      <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <MetricCard label="Products" value={data?.total_products || data?.total_skus || 0} tone="blue" icon={Boxes} />
        <MetricCard label="Empty Bottles in Stock" value={number(data?.current_stock)} tone="green" icon={Package} />
        <MetricCard label="Bottles Sold Today" value={number(data?.today_sales_qty)} tone="amber" icon={ShoppingCart} />
        <MetricCard label="Bottles Sold This Week" value={number(data?.week_sales_qty)} tone="purple" icon={ArrowDownUp} />
        {showFinancials && (
          <MetricCard
            label="This Month Revenue"
            value={money(data?.month_sales_amount)}
            sub={`${number(data?.month_sales_qty)} bottles sold`}
            tone="slate"
            icon={TrendingUp}
          />
        )}
      </div>

      {!showFinancials && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Cashier view shows bottle quantities only. Owner login is required to view revenue.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Last 7 Days Bottle Sales</h2>
              <p className="text-sm text-gray-500">Daily bottles sold</p>
            </div>
          </div>
          <QtyTrendChart rows={data?.trend || []} />
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Low Stock Products</h2>
              <p className="text-sm text-gray-500">Products that need empty bottle stock soon</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {number(data?.low_stock_count)} products
            </span>
          </div>
          <div className="space-y-3">
            {data?.low_stock_items?.length ? data.low_stock_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{item.item_name}</p>
                  <p className="text-sm text-gray-500">{item.size_label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-amber-600">{number(item.current_stock)}</p>
                  <p className="text-xs text-gray-500">bottles left</p>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                No low stock product right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Recent Entries</h2>
            <p className="text-sm text-gray-500">Latest empty bottle stock and sale activity</p>
          </div>
          <Link href="/dashboard/stock" className="text-sm font-medium text-primary hover:underline">Open sales</Link>
        </div>
        <div className="space-y-3">
          {data?.recent_transactions?.length ? data.recent_transactions.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-gray-900">{entry.item_name} | {entry.size_label}</p>
                <p className="text-sm text-gray-500">
                  {entry.txn_type === 'stock_in' ? 'Empty bottles added' : entry.txn_type === 'sale' ? 'Sale invoice' : entry.txn_type === 'damage' ? 'Damaged / waste bottles' : 'Sale return'} | {entry.txn_date} | {entry.quantity} bottles
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-semibold text-gray-900">{entry.quantity} bottles</p>
                {showFinancials && entry.unit_price !== null && (
                  <p className="text-sm text-gray-500">Rs {Number(entry.unit_price || 0).toLocaleString()} / bottle</p>
                )}
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              No stock or sales entry yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
