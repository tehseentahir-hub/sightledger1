'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { ArrowDownUp, Boxes, Calendar, Plus, ShoppingCart } from 'lucide-react'

import { useAuth } from '../../../context/AuthContext'
import CenterDialog from '../../../components/CenterDialog'
import { API_URL, getRequestErrorMessage } from '../../../lib/api'
import { canViewPetFinancials, hasPetInventoryMode, isRestrictedPetCashier } from '../../../lib/businessMode'

const transactionTypes = [
  { value: 'stock_in', label: 'Stock In' },
  { value: 'sale', label: 'Sale' },
  { value: 'damage', label: 'Damage / Waste' },
  { value: 'return_in', label: 'Customer Return In' },
  { value: 'adjustment_in', label: 'Adjustment In' },
  { value: 'adjustment_out', label: 'Adjustment Out' },
]

const emptyForm = {
  item_id: '',
  txn_type: 'sale',
  quantity: '',
  unit_price: '',
  txn_date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function PetStockPage() {
  const { user, mounted, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [dialog, setDialog] = useState({ open: false, type: 'error', title: '', message: '', onConfirm: null, onCancel: null })

  const petMode = hasPetInventoryMode(user)
  const hideFinancials = isRestrictedPetCashier(user)
  const showFinancials = canViewPetFinancials(user)
  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items])

  useEffect(() => {
    if (!mounted || loading) return
    if (!petMode) {
      router.replace('/dashboard')
      return
    }
    loadPage()
  }, [mounted, loading, petMode, router])

  const showError = (message, title = 'Stock Entry Error') => {
    setDialog({
      open: true,
      type: 'error',
      title,
      message,
      onConfirm: () => setDialog((prev) => ({ ...prev, open: false })),
      onCancel: null,
    })
  }

  const showSuccess = (message, title = 'Done') => {
    setDialog({
      open: true,
      type: 'success',
      title,
      message,
      onConfirm: () => setDialog((prev) => ({ ...prev, open: false })),
      onCancel: null,
    })
  }

  const loadPage = async () => {
    setPageLoading(true)
    try {
      const [itemsRes, summaryRes, txnRes] = await Promise.all([
        axios.get(`${API_URL}/pet/items`),
        axios.get(`${API_URL}/pet/summary`),
        axios.get(`${API_URL}/pet/transactions`),
      ])
      setItems(itemsRes.data || [])
      setSummary(summaryRes.data || null)
      setTransactions(txnRes.data || [])
      setForm((prev) => ({
        ...prev,
        item_id: prev.item_id || itemsRes.data?.find((item) => item.is_active)?.id || '',
      }))
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to load stock and sales data right now.'))
    }
    setPageLoading(false)
  }

  const submitEntry = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        unit_price: hideFinancials || form.unit_price === '' ? undefined : Number(form.unit_price),
      }
      await axios.post(`${API_URL}/pet/transactions`, payload)
      setForm((prev) => ({
        ...emptyForm,
        item_id: prev.item_id,
        txn_type: 'sale',
        txn_date: new Date().toISOString().split('T')[0],
      }))
      showSuccess('Stock entry saved successfully.')
      loadPage()
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to save stock entry right now.'))
    }
    setSaving(false)
  }

  if (!mounted || loading || pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!petMode) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">PET / Multi-Size Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Stock & Sales Entry</h1>
          <p className="mt-1 text-sm text-gray-500">Record stock in, sales, returns, damage, and adjustments item by item.</p>
        </div>
      </div>

      {hideFinancials && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Cashier view hides amount fields and financial totals. Sales quantity and stock movement remain available.
        </div>
      )}

      <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        <Metric label="Active SKUs" value={summary?.total_skus || 0} icon={Boxes} />
        <Metric label="Current Stock" value={summary?.current_stock || 0} icon={ArrowDownUp} />
        <Metric label="Today Sales Qty" value={summary?.today_sales_qty || 0} icon={ShoppingCart} />
        {showFinancials && <Metric label="Today Sales Amount" value={`Rs ${Number(summary?.today_sales_amount || 0).toLocaleString()}`} icon={Calendar} />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px),minmax(0,1fr)]">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Add Entry</h2>
          </div>
          <form onSubmit={submitEntry} className="space-y-4">
            <Field label="Item *">
              <select value={form.item_id} onChange={(e) => setForm((prev) => ({ ...prev, item_id: e.target.value }))} className="input" required>
                <option value="">Select item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item_name} - {item.size_label} ({Number(item.current_stock || 0).toLocaleString()} in stock)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transaction Type *">
              <select value={form.txn_type} onChange={(e) => setForm((prev) => ({ ...prev, txn_type: e.target.value }))} className="input" required>
                {transactionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Quantity *">
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} className="input" required />
              </Field>
              <Field label="Date">
                <input type="date" value={form.txn_date} onChange={(e) => setForm((prev) => ({ ...prev, txn_date: e.target.value }))} className="input" />
              </Field>
            </div>
            {!hideFinancials && (
              <Field label="Unit Price">
                <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))} className="input" />
              </Field>
            )}
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="input" rows={3} />
            </Field>
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Entries</h2>
              <p className="text-sm text-gray-500">Latest stock, sales, and adjustments</p>
            </div>
          </div>
          <div className="space-y-3">
            {transactions.length ? transactions.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{entry.item_name} • {entry.size_label}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {entry.txn_type.replaceAll('_', ' ')} • {entry.txn_date}
                    </p>
                    {entry.notes && <p className="mt-2 text-sm text-gray-600">{entry.notes}</p>}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-lg font-semibold text-gray-900">{Number(entry.quantity || 0).toLocaleString()} {entry.unit_type}</p>
                    {showFinancials && entry.unit_price !== null && (
                      <p className="text-sm text-gray-500">Rs {Number(entry.unit_price || 0).toLocaleString()} / unit</p>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                No stock or sales entry recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <CenterDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  )
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{typeof value === 'number' ? Number(value || 0).toLocaleString() : value}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
