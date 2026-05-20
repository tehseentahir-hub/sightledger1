'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import jsPDF from 'jspdf'
import {
  AlertCircle,
  ArrowDownUp,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Download,
  Filter,
  Package,
  RefreshCcw,
  Search,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react'

import { API_URL } from '../../../lib/api'

const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`
const number = (value) => Number(value || 0).toLocaleString()

function StatCard({ label, value, tone = 'blue', icon: Icon, sub }) {
  const tones = {
    blue: 'from-blue-500 to-sky-500',
    green: 'from-emerald-500 to-green-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
    slate: 'from-slate-700 to-slate-900',
  }

  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-white/75">{sub}</p>}
        </div>
        {Icon && <Icon className="h-6 w-6 text-white/80" />}
      </div>
    </div>
  )
}

function EmptyState({ title = 'No data found', message = 'Try changing the selected dates.' }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-gray-300" />
      <p className="mt-3 font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  )
}

function BarChart({ data = [], valueKey, labelKey = 'day', color = '#16a34a', formatValue = number }) {
  if (!data.length) return <EmptyState message="No chart data found for the selected period." />

  const values = data.map((item) => Number(item[valueKey] || 0))
  const max = Math.max(1, ...values)
  const width = Math.max(360, data.length * 58)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 190`} className="h-52 w-full min-w-[360px]">
        {data.map((item, index) => {
          const value = Number(item[valueKey] || 0)
          const height = Math.max(6, (value / max) * 120)
          const x = index * 58 + 18
          const y = 145 - height
          const label = String(item[labelKey] || item.date || '').slice(-2)
          return (
            <g key={`${label}-${index}`}>
              <rect x={x} y={y} width="28" height={height} rx="6" fill={color} />
              <text x={x + 14} y={y - 6} fontSize="10" textAnchor="middle" fill="#0f172a">{formatValue(value)}</text>
              <text x={x + 14} y="168" fontSize="10" textAnchor="middle" fill="#64748b">{label || '-'}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SplitBars({ data = [] }) {
  if (!data.length) return <EmptyState message="No home and walk-in comparison data found." />

  const max = Math.max(1, ...data.map((item) => Number(item.home_bottles || 0) + Number(item.walkin_bottles || 0)))
  const width = Math.max(360, data.length * 64)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 190`} className="h-52 w-full min-w-[360px]">
        {data.map((item, index) => {
          const home = Number(item.home_bottles || 0)
          const walkin = Number(item.walkin_bottles || 0)
          const homeHeight = Math.max(5, (home / max) * 120)
          const walkinHeight = Math.max(5, (walkin / max) * 120)
          const x = index * 64 + 16
          const label = String(item.day || '').slice(-2)
          return (
            <g key={`${item.day}-${index}`}>
              <rect x={x} y={145 - homeHeight} width="20" height={homeHeight} rx="5" fill="#2563eb" />
              <rect x={x + 24} y={145 - walkinHeight} width="20" height={walkinHeight} rx="5" fill="#16a34a" />
              <text x={x + 22} y="168" fontSize="10" textAnchor="middle" fill="#64748b">{label || '-'}</text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Home bottles</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" /> Walk-in bottles</span>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [search, setSearch] = useState('')
  const [depositOnly, setDepositOnly] = useState(false)
  const [filter, setFilter] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  const reports = [
    { value: 'monthly', label: 'Sales', desc: 'Monthly sales and bottles', icon: TrendingUp },
    { value: 'profit', label: 'Profit & Loss', desc: 'Income, expenses, profit', icon: WalletCards },
    { value: 'outstanding', label: 'Pending', desc: 'Payments to collect', icon: AlertCircle },
    { value: 'customers', label: 'Customers', desc: 'Customer health list', icon: Users },
    { value: 'daily', label: 'Daily', desc: 'Date-wise delivery detail', icon: Calendar },
    { value: 'bottles', label: 'Bottles', desc: 'Inventory circulation', icon: Package },
  ]

  useEffect(() => {
    loadReport()
  }, [activeReport, filter.month, filter.year, filter.start_date, filter.end_date])

  const monthRange = () => ({
    start_date: `${filter.year}-${String(filter.month).padStart(2, '0')}-01`,
    end_date: new Date(filter.year, filter.month, 0).toISOString().split('T')[0],
  })

  const dateParams = () => {
    if (activeReport === 'monthly' || activeReport === 'profit') {
      return { type: activeReport, ...monthRange() }
    }
    return { type: activeReport, start_date: filter.start_date, end_date: filter.end_date }
  }

  const loadReport = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeReport === 'outstanding') {
        const res = await axios.get(`${API_URL}/payments/outstanding`)
        setReport(res.data)
      } else if (activeReport === 'customers') {
        const [customersRes, ledgerRes] = await Promise.all([
          axios.get(`${API_URL}/customers`),
          axios.get(`${API_URL}/payments/outstanding`),
        ])
        setReport({ customers: customersRes.data || [], balances: ledgerRes.data || {} })
      } else if (activeReport === 'bottles') {
        const [inventoryRes, circulationRes] = await Promise.all([
          axios.get(`${API_URL}/inventory`),
          axios.get(`${API_URL}/dashboard/reports`, { params: dateParams() }),
        ])
        setReport({ inventory: inventoryRes.data || {}, circulation: circulationRes.data?.circulation || {} })
      } else {
        const res = await axios.get(`${API_URL}/dashboard/reports`, { params: dateParams() })
        setReport(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load report right now.')
      setReport(null)
    }
    setLoading(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Sight Ledger ${activeReport.toUpperCase()} Report`, 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' })
    doc.text(`Report: ${reports.find((item) => item.value === activeReport)?.label}`, 20, 42)

    if (activeReport === 'profit' && report) {
      doc.text(`Income: ${currency(report.income)}`, 20, 54)
      doc.text(`Expenses: ${currency(report.expenses)}`, 20, 64)
      doc.text(`Profit: ${currency(report.profit)}`, 20, 74)
    }

    if (activeReport === 'outstanding' && report) {
      const total = (report.outstanding || []).reduce((sum, row) => sum + Number(row.outstanding || 0), 0)
      doc.text(`Total Pending: ${currency(total)}`, 20, 54)
    }

    doc.save(`sight_ledger_${activeReport}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const active = reports.find((item) => item.value === activeReport)
  const monthlyRows = report?.trend || report?.report || []
  const outstandingRows = report?.outstanding || []
  const advanceRows = report?.advances || []
  const customerRows = (report?.customers || []).filter((customer) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [customer.name, customer.phone, customer.address, customer.payment_type]
      .some((value) => String(value || '').toLowerCase().includes(query))
    if (!matchesSearch) return false
    if (depositOnly) return Number(customer.security_deposit_amount || 0) > 0
    return true
  })
  const inventory = report?.inventory || report || {}
  const circulation = report?.circulation || {}
  const pendingTotal = outstandingRows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0)
  const advanceTotal = advanceRows.reduce((sum, row) => sum + Number(row.advance || 0), 0)
  const activeCustomers = customerRows.filter((customer) => customer.is_active).length
  const creditCustomers = customerRows.filter((customer) => customer.payment_type === 'credit').length
  const securityDepositTotal = customerRows.reduce((sum, customer) => sum + Number(customer.security_deposit_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Shop Owner Reports</p>
          <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Sales, profit, pending payments, customers, and bottle movement in one simple view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={loadReport} className="btn btn-secondary inline-flex items-center gap-2">
            <RefreshCcw size={18} /> Refresh
          </button>
          <button onClick={exportToPDF} className="btn btn-primary inline-flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {reports.map((item) => (
          <button
            key={item.value}
            onClick={() => setActiveReport(item.value)}
            className={`rounded-xl border p-4 text-left transition ${activeReport === item.value ? 'border-primary bg-primary text-white shadow-md' : 'border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm'}`}
          >
            <item.icon className={`mb-3 h-5 w-5 ${activeReport === item.value ? 'text-white' : 'text-primary'}`} />
            <p className="font-semibold">{item.label}</p>
            <p className={`mt-1 text-xs ${activeReport === item.value ? 'text-white/80' : 'text-gray-500'}`}>{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            {active?.icon && <active.icon size={18} className="text-primary" />}
            {active?.label}
          </div>

          {(activeReport === 'monthly' || activeReport === 'profit') ? (
            <>
              <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: Number(e.target.value) })} className="input w-full sm:w-40">
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>{new Date(0, index).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
              <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: Number(e.target.value) })} className="input w-full sm:w-28">
                {[2024, 2025, 2026, 2027].map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </>
          ) : activeReport !== 'customers' ? (
            <>
              <input type="date" value={filter.start_date} onChange={(e) => setFilter({ ...filter, start_date: e.target.value })} className="input w-full sm:w-40" />
              <input type="date" value={filter.end_date} onChange={(e) => setFilter({ ...filter, end_date: e.target.value })} className="input w-full sm:w-40" />
            </>
          ) : (
            <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Search customer, phone, address..." />
              </div>
              <button
                type="button"
                onClick={() => setDepositOnly(!depositOnly)}
                className={`btn w-full justify-center sm:w-auto ${depositOnly ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Filter size={16} />
                Security Deposit Only
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}

      {!loading && error && <EmptyState title="Report error" message={error} />}

      {!loading && !error && activeReport === 'monthly' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Monthly Sales" value={currency(report.summary?.total_sales)} tone="green" icon={TrendingUp} />
            <StatCard label="Total Bottles" value={number(report.summary?.total_bottles)} tone="blue" icon={Package} />
            <StatCard label="Home Bottles" value={number(report.summary?.home_bottles)} tone="slate" icon={Truck} sub={`${number(report.summary?.home_deliveries)} deliveries`} />
            <StatCard label="Walk-in Bottles" value={number(report.summary?.walkin_bottles)} tone="amber" icon={Users} sub={`${number(report.summary?.walkin_deliveries)} visits`} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Daily Sales Trend</h2>
              <BarChart data={monthlyRows} valueKey="total_sales" color="#16a34a" formatValue={currency} />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Home vs Walk-in Bottles</h2>
              <SplitBars data={monthlyRows} />
            </div>
          </div>
          <ReportTable rows={monthlyRows} columns={[
            ['day', 'Date'],
            ['total_bottles', 'Bottles'],
            ['home_bottles', 'Home'],
            ['walkin_bottles', 'Walk-in'],
            ['total_sales', 'Sales', currency],
          ]} />
        </div>
      )}

      {!loading && !error && activeReport === 'profit' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatCard label="Income" value={currency(report.income)} tone="green" icon={ArrowUpRight} sub={`Home ${currency(report.income_breakdown?.home_income)} | Walk-in ${currency(report.income_breakdown?.walkin_income)}`} />
            <StatCard label="Expenses" value={currency(report.expenses)} tone="red" icon={ArrowDownRight} />
            <StatCard label="Net Profit" value={currency(report.profit)} tone={Number(report.profit || 0) >= 0 ? 'blue' : 'amber'} icon={WalletCards} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Daily Profit Trend</h2>
              <BarChart data={report.daily || []} valueKey="profit" color="#2563eb" formatValue={currency} />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Expense Breakdown</h2>
              <ReportTable rows={report.expense_breakdown || []} columns={[
                ['expense_type', 'Type'],
                ['total', 'Amount', currency],
          ]} emptyMessage="No expenses were recorded for this month." />
            </div>
          </div>
        </div>
      )}

      {!loading && !error && activeReport === 'outstanding' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatCard label="Pending Collection" value={currency(pendingTotal)} tone="red" icon={AlertCircle} sub={`${number(outstandingRows.length)} customers`} />
            <StatCard label="Advance Balance" value={currency(advanceTotal)} tone="green" icon={WalletCards} sub={`${number(advanceRows.length)} customers`} />
            <StatCard label="Credit Customers Checked" value={number((report.all || []).length)} tone="blue" icon={Users} />
          </div>
          <ReportTable rows={outstandingRows} columns={[
            ['name', 'Customer'],
            ['phone', 'Phone'],
            ['total_bottles', 'Bottles'],
            ['total_billed', 'Billed', currency],
            ['total_paid', 'Paid', currency],
            ['outstanding', 'Pending', currency],
          ]} emptyMessage="No customer payments are pending." />
        </div>
      )}

      {!loading && !error && activeReport === 'customers' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Customers" value={number(customerRows.length)} tone="blue" icon={Users} />
            <StatCard label="Active Customers" value={number(activeCustomers)} tone="green" icon={Users} />
            <StatCard label="Credit Customers" value={number(creditCustomers)} tone="amber" icon={WalletCards} />
            <StatCard label="Bottles Outside" value={number(customerRows.reduce((sum, customer) => sum + Number(customer.total_bottles_outside || 0), 0))} tone="slate" icon={Package} />
            <StatCard label="Security Deposits Held" value={currency(securityDepositTotal)} tone="green" icon={WalletCards} />
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setDepositOnly(!depositOnly)}
              className={`btn w-full justify-center sm:w-auto ${depositOnly ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Filter size={16} />
              Security Deposit Only
            </button>
          </div>
          <ReportTable rows={customerRows} columns={[
            ['name', 'Customer'],
            ['phone', 'Phone'],
            ['payment_type', 'Payment'],
            ['rate_per_bottle', 'Rate', currency],
            ['security_deposit_amount', 'Security Deposit', currency],
            ['total_bottles_outside', 'Bottles Outside'],
            ['pending_amount', 'Pending', currency],
            ['is_active', 'Status', (value) => value ? 'Active' : 'Inactive'],
          ]} emptyMessage="No customer matched your search." />
        </div>
      )}

      {!loading && !error && activeReport === 'daily' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Deliveries" value={number(report.summary?.total_customers)} tone="blue" icon={Truck} />
            <StatCard label="Bottles" value={number(report.summary?.total_bottles)} tone="slate" icon={Package} />
            <StatCard label="Revenue" value={currency(report.summary?.total_amount)} tone="green" icon={TrendingUp} />
            <StatCard label="Walk-ins" value={number(report.summary?.walkin_deliveries)} tone="amber" icon={Users} />
          </div>
          <ReportTable rows={report.report || []} columns={[
            ['customer_name', 'Customer'],
            ['bottles_delivered', 'Delivered'],
            ['bottles_returned', 'Returned'],
            ['amount', 'Amount', currency],
            ['delivery_type', 'Type', (value) => value === 'walk_in' ? 'Walk-in' : 'Home'],
            ['rider_name', 'Rider'],
          ]} emptyMessage="No deliveries were found for the selected date range." />
        </div>
      )}

      {!loading && !error && activeReport === 'bottles' && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Bottles" value={number(inventory.total_bottles)} tone="blue" icon={Package} />
            <StatCard label="With Customers" value={number(inventory.bottles_with_customers)} tone="amber" icon={Users} />
            <StatCard label="In Shop" value={number(inventory.bottles_in_shop)} tone="green" icon={Package} />
            <StatCard label="Lost/Damaged" value={number(inventory.lost_damaged)} tone="red" icon={AlertCircle} />
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Selected Period Circulation</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MiniMetric label="Delivered" value={circulation.total_delivered} />
              <MiniMetric label="Returned" value={circulation.total_returned} />
              <MiniMetric label="Home Deliveries" value={circulation.home_deliveries} />
              <MiniMetric label="Walk-ins" value={circulation.walkin_deliveries} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{number(value)}</p>
    </div>
  )
}

function ReportTable({ rows = [], columns = [], emptyMessage = 'No rows found.' }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return { key: null, direction: 'asc' }
    })
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key) return 0
    const va = a?.[sortConfig.key]
    const vb = b?.[sortConfig.key]
    const na = Number(va)
    const nb = Number(vb)
    let cmp = 0
    if (Number.isFinite(na) && Number.isFinite(nb) && `${va}` !== '' && `${vb}` !== '') {
      cmp = na - nb
    } else {
      cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true, sensitivity: 'base' })
    }
    return sortConfig.direction === 'asc' ? cmp : -cmp
  })

  if (!rows.length) return <EmptyState message={emptyMessage} />

  return (
    <div>
      <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(([key, label]) => (
                <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    {label}
                    <ArrowDownUp size={12} className={sortConfig.key === key ? 'text-primary' : 'text-gray-400'} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, index) => (
              <tr key={row.id || `${index}-${row.name || row.day || row.customer_name}`} className="hover:bg-gray-50">
                {columns.map(([key, label, format]) => (
                  <td key={`${label}-${key}`} className="px-4 py-3 text-sm text-gray-700">
                    {format ? format(row[key], row) : (row[key] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {sortedRows.map((row, index) => {
          const titleColumn = columns[0]
          const titleValue = titleColumn
            ? (titleColumn[2] ? titleColumn[2](row[titleColumn[0]], row) : row[titleColumn[0]])
            : `Row ${index + 1}`

          return (
            <div key={row.id || `${index}-${row.name || row.day || row.customer_name}`} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold text-gray-900">{titleValue || '-'}</p>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">#{index + 1}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                {columns.slice(1).map(([key, label, format]) => (
                  <div key={`${label}-${key}`} className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="max-w-[60%] truncate text-right font-medium text-gray-800">
                      {format ? format(row[key], row) : (row[key] || '-')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
