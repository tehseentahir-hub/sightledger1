'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { AlertCircle, BarChart3, Calendar, Download, Package, RefreshCcw, Star, TrendingUp } from 'lucide-react'

import { API_URL, getRequestErrorMessage } from '../../lib/api'
import { canViewPetFinancials } from '../../lib/businessMode'
import { downloadPetInvoicePdf } from '../../lib/petInvoicePdf'

const money = (value) => `Rs ${Number(value || 0).toLocaleString()}`
const number = (value) => Number(value || 0).toLocaleString()

function StatCard({ label, value, sub, tone = 'blue', icon: Icon }) {
  const tones = {
    blue: 'from-blue-500 to-sky-500',
    green: 'from-emerald-500 to-green-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-purple-500',
    rose: 'from-rose-500 to-red-500',
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-lg`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/80">{sub}</p>}
    </div>
  )
}

function TrendChart({ rows = [], showFinancials = false }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-400">No sales trend available for selected dates.</p>
  }

  const key = showFinancials ? 'sales_amount' : 'sales_qty'
  const max = Math.max(1, ...rows.map((row) => Number(row[key] || 0)))
  const width = Math.max(360, rows.length * 58)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 188`} className="h-56 w-full min-w-[360px]">
        {rows.map((row, index) => {
          const value = Number(row[key] || 0)
          const barHeight = Math.max(6, (value / max) * 112)
          const x = index * 58 + 16
          const label = String(row.txn_date || '').slice(-2)
          return (
            <g key={`${row.txn_date}-${index}`}>
              <rect x={x} y={142 - barHeight} width="28" height={barHeight} rx="7" fill={showFinancials ? '#8b5cf6' : '#0ea5e9'} />
              <text x={x + 14} y={132 - barHeight} textAnchor="middle" fontSize="10" fill="#0f172a">
                {showFinancials ? money(value).replace('Rs ', '') : value}
              </text>
              <text x={x + 14} y="166" textAnchor="middle" fontSize="10" fill="#64748b">{label || '-'}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ProductSharePie({ products = [], showFinancials = false }) {
  const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']
  const rows = products
    .map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
      value: Number(showFinancials ? item.sold_amount : item.sold_qty || 0),
    }))
    .filter((item) => item.value > 0)
    .slice(0, 6)
  const total = rows.reduce((sum, item) => sum + item.value, 0)

  if (!total) {
    return <p className="text-sm text-gray-400">No product sales share available for selected dates.</p>
  }

  let cursor = 0
  const gradient = rows.map((item) => {
    const start = cursor
    const end = cursor + (item.value / total) * 100
    cursor = end
    return `${item.color} ${start}% ${end}%`
  }).join(', ')

  return (
    <div className="grid gap-5 sm:grid-cols-[180px,minmax(0,1fr)] sm:items-center">
      <div
        className="mx-auto h-44 w-44 rounded-full border border-slate-100 shadow-inner"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label="Product sales share chart"
      />
      <div className="space-y-3">
        {rows.map((item) => {
          const percentage = Math.round((item.value / total) * 100)
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 flex-none rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate font-medium text-gray-800">{item.item_name} {item.size_label}</span>
              </div>
              <span className="flex-none font-semibold text-gray-900">{percentage}%</span>
            </div>
          )
        })}
      </div>
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
    const start = new Date(today.getTime() - (29 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    return { start_date: start, end_date: end }
  })
  const showFinancials = canViewPetFinancials(user)
  const products = report?.product_summary || []
  const customers = report?.customer_summary || []
  const invoices = report?.recent_sales || []
  const totalStock = useMemo(() => products.reduce((sum, row) => sum + Number(row.current_stock || 0), 0), [products])
  const pendingCustomers = useMemo(
    () => customers.filter((row) => Number(row.outstanding_balance || 0) > 0),
    [customers]
  )

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
      setError(getRequestErrorMessage(err, 'Unable to load packaged bottle reports right now.'))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Packaged Bottle Reports</p>
          <h1 className="text-2xl font-bold text-gray-900">Sales, Stock & Invoice Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            See how many bottles are in stock, sold, invoiced, and which customers are buying.
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
          Cashier report view hides rupee amounts. Quantity, stock, and invoice records are still visible.
        </div>
      )}

      {loading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">Report Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && report && (
        <>
          <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <StatCard label="Products" value={number(report.summary?.total_products)} tone="blue" icon={Package} />
            <StatCard label="Bottles in Stock" value={number(totalStock)} tone="green" icon={Package} />
            <StatCard label="Bottles Sold" value={number(report.summary?.total_sold_qty)} tone="amber" icon={TrendingUp} />
            <StatCard label="Low Stock" value={number(report.summary?.low_stock_count)} tone="rose" icon={AlertCircle} />
            {showFinancials && <StatCard label="Revenue" value={money(report.summary?.total_sold_amount)} tone="purple" icon={BarChart3} />}
          </div>

          {showFinancials && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-gray-500">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Top Selling Product</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{report.summary?.top_product || 'No sales yet'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Outstanding Balance</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{money(report.summary?.total_outstanding)}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Invoice Records</p>
                <p className="mt-1 text-2xl font-bold text-primary">{number(invoices.length)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Product Sales Share</h2>
              </div>
              <ProductSharePie products={products} showFinancials={showFinancials} />
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Daily Sales Trend</h2>
              </div>
              <TrendChart rows={report.daily_trend || []} showFinancials={showFinancials} />
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Low Stock Products</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {number(report.low_stock?.length)} products
                </span>
              </div>
              <div className="space-y-3">
                {report.low_stock?.length ? report.low_stock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-500">{item.size_label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{number(item.current_stock)}</p>
                      <p className="text-xs text-gray-500">bottles left</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                    No low stock products right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          {showFinancials && (
            <ReportSection title="Customers with Pending Balance" subtitle="Credit and partial-payment customers who still need to pay.">
              <ResponsiveTable
                rows={pendingCustomers}
                empty="No pending customer balance found for selected dates."
                columns={[
                  ['name', 'Customer'],
                  ['customer_type', 'Type'],
                  ['phone', 'Phone'],
                  ['purchased_amount', 'Total Purchase', money],
                  ['paid_amount', 'Paid', money],
                  ['outstanding_balance', 'Pending Balance', money],
                ]}
              />
            </ReportSection>
          )}

          <ReportSection title="Product Reports" subtitle="Current stock, bottles sold, and revenue by product.">
            <ResponsiveTable
              rows={products}
              empty="No product report found for selected dates."
              columns={[
                ['item_name', 'Product'],
                ['size_label', 'Bottle Size'],
                ['current_stock', 'Current Stock', number],
                ['sold_today', 'Sold Today', number],
                ['sold_qty', 'Sold in Period', number],
                ...(showFinancials ? [['sold_amount', 'Revenue', money]] : []),
              ]}
            />
          </ReportSection>

          <ReportSection title="Customer Reports" subtitle="Sales by customer, customer type, purchase history, and pending amount.">
            <ResponsiveTable
              rows={customers}
              empty="No customer purchase data found for selected dates."
              columns={[
                ['name', 'Customer'],
                ['customer_type', 'Type'],
                ['phone', 'Phone'],
                ['purchased_qty', 'Bottles Purchased', number],
                ...(showFinancials ? [['purchased_amount', 'Total Purchase', money], ['outstanding_balance', 'Outstanding', money]] : []),
              ]}
            />
          </ReportSection>

          <ReportSection title="Invoice History" subtitle="Recent sale invoices for selected dates.">
            <InvoiceHistory rows={invoices} showFinancials={showFinancials} shopName={user?.shop_name || user?.shopName || 'Water Shop'} />
          </ReportSection>
        </>
      )}
    </div>
  )
}

function InvoiceHistory({ rows = [], showFinancials = false, shopName = 'Water Shop' }) {
  if (!rows.length) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          No invoice found for selected dates.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {rows.map((row) => (
        <div key={row.id || row.invoice_number} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">{row.invoice_number || `PET-${row.id}`}</p>
                <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">{row.txn_date}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{row.customer_name || 'Customer'} | {row.customer_type || 'Retail'}</p>
              <p className="text-sm text-gray-500">{row.item_name} {row.size_label} | {number(row.quantity)} bottles</p>
            </div>
            <div className="text-left lg:text-right">
              {showFinancials && (
                <>
                  <p className="text-sm text-gray-500">Total: <span className="font-semibold text-gray-900">{money(row.total_amount)}</span></p>
                  <p className="text-sm text-gray-500">Paid: <span className="font-semibold text-emerald-700">{money(row.paid_amount)}</span></p>
                  {Number(row.outstanding_amount || 0) > 0 && (
                    <p className="text-sm font-semibold text-red-600">Pending: {money(row.outstanding_amount)}</p>
                  )}
                </>
              )}
              {showFinancials && (
                <button
                  type="button"
                  onClick={() => downloadPetInvoicePdf(row, { shopName })}
                  className="btn btn-secondary mt-3 inline-flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download PDF
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportSection({ title, subtitle, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function ResponsiveTable({ rows = [], columns = [], empty }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px]">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(([, label]) => (
                <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.length ? rows.map((row, index) => (
              <tr key={row.id || row.invoice_number || index}>
                {columns.map(([key, label, formatter]) => (
                  <td key={`${row.id || index}-${key}`} className="px-4 py-3 text-sm text-gray-800">
                    {formatter ? formatter(row[key]) : (row[key] || '-')}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-400">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {rows.length ? rows.map((row, index) => (
          <div key={row.id || row.invoice_number || index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            {columns.map(([key, label, formatter]) => (
              <div key={`${row.id || index}-${key}`} className="flex justify-between gap-3 border-b border-gray-50 py-2 last:border-0">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
                <span className="text-right text-sm font-medium text-gray-900">{formatter ? formatter(row[key]) : (row[key] || '-')}</span>
              </div>
            ))}
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            {empty}
          </div>
        )}
      </div>
    </>
  )
}
