'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { AlertCircle, BarChart3, Calendar, Package, RefreshCcw, TrendingUp } from 'lucide-react'

import { API_URL, getRequestErrorMessage } from '../../lib/api'
import { canViewPetFinancials } from '../../lib/businessMode'

function StatCard({ label, value, sub, tone = 'blue', icon: Icon }) {
  const tones = {
    blue: 'from-blue-500 to-sky-500',
    green: 'from-emerald-500 to-green-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-purple-500',
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-lg`}>
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-5 w-5 text-white/85" />
      </div>
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/80">{sub}</p>}
    </div>
  )
}

function TrendChart({ rows = [], showFinancials = false }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">No report trend available for selected dates.</p>
  }

  const key = showFinancials ? 'sales_amount' : 'sales_qty'
  const max = Math.max(1, ...rows.map((row) => Number(row[key] || 0)))
  const width = Math.max(360, rows.length * 56)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 180`} className="h-52 w-full min-w-[360px]">
        {rows.map((row, index) => {
          const value = Number(row[key] || 0)
          const barHeight = Math.max(6, (value / max) * 110)
          const x = index * 56 + 16
          const label = String(row.txn_date || '').slice(-2)
          return (
            <g key={`${row.txn_date}-${index}`}>
              <rect x={x} y={138 - barHeight} width="26" height={barHeight} rx="6" fill={showFinancials ? '#8b5cf6' : '#10b981'} />
              <text x={x + 13} y={128 - barHeight} textAnchor="middle" fontSize="10" fill="#0f172a">
                {showFinancials ? `Rs ${value}` : value}
              </text>
              <text x={x + 13} y="160" textAnchor="middle" fontSize="10" fill="#64748b">{label || '-'}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function PetReportsView({ user }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(() => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    const start = new Date(today.getTime() - (6 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    return { start_date: start, end_date: end }
  })
  const showFinancials = canViewPetFinancials(user)

  useEffect(() => {
    loadReport()
  }, [filters.start_date, filters.end_date])

  const loadReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API_URL}/pet/reports`, { params: filters })
      setReport(res.data)
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Unable to load PET reports right now.'))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">PET / Multi-Size Reports</p>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Stock Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track item-wise quantities, low stock, and daily movement for PET inventory.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="date" value={filters.start_date} onChange={(e) => setFilters((prev) => ({ ...prev, start_date: e.target.value }))} className="input w-full sm:w-40" />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters((prev) => ({ ...prev, end_date: e.target.value }))} className="input w-full sm:w-40" />
          <button onClick={loadReport} className="btn btn-secondary inline-flex items-center gap-2">
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {!showFinancials && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Cashier report view hides sales amounts. You can still review quantities, stock movement, and low stock items.
        </div>
      )}

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">PET reports error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && report && (
        <>
          <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
            <StatCard label="Active SKUs" value={report.summary?.total_skus || 0} tone="blue" icon={Package} />
            <StatCard label="Units Sold" value={Number(report.summary?.total_sold_qty || 0).toLocaleString()} tone="green" icon={TrendingUp} />
            <StatCard label="Low Stock Items" value={report.summary?.low_stock_count || 0} tone="amber" icon={AlertCircle} />
            {showFinancials && (
              <StatCard
                label="Sales Amount"
                value={`Rs ${Number(report.summary?.total_sold_amount || 0).toLocaleString()}`}
                tone="purple"
                icon={BarChart3}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Daily Trend</h2>
              </div>
              <TrendChart rows={report.daily_trend || []} showFinancials={showFinancials} />
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Low Stock Watch</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {report.low_stock?.length || 0} items
                </span>
              </div>
              <div className="space-y-3">
                {report.low_stock?.length ? report.low_stock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-500">{item.size_label} • {item.unit_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{Number(item.current_stock || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">units left</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                    No low stock items found in this period.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Item Summary</h2>
              <p className="text-sm text-gray-500">Item-wise sold quantity and live stock position</p>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Current Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Sold Qty</th>
                    {showFinancials && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Sales Amount</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {report.item_summary?.length ? report.item_summary.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.size_label}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{Number(item.current_stock || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{Number(item.sold_qty || 0).toLocaleString()}</td>
                      {showFinancials && <td className="px-4 py-3 text-sm text-gray-900">Rs {Number(item.sold_amount || 0).toLocaleString()}</td>}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={showFinancials ? 6 : 5} className="px-4 py-8 text-center text-sm text-gray-400">No item data found for selected dates.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {report.item_summary?.length ? report.item_summary.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-gray-900">{item.item_name}</p>
                  <p className="mt-1 text-sm text-gray-500">{item.size_label} • {item.unit_type}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Current Stock</p>
                      <p className="mt-1 font-semibold text-gray-900">{Number(item.current_stock || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Sold Qty</p>
                      <p className="mt-1 font-semibold text-gray-900">{Number(item.sold_qty || 0).toLocaleString()}</p>
                    </div>
                    {showFinancials && (
                      <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-500">Sales Amount</p>
                        <p className="mt-1 font-semibold text-gray-900">Rs {Number(item.sold_amount || 0).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                  No item data found for selected dates.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
