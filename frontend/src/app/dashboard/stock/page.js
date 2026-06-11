'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Calendar, Download, FileText, PackagePlus, Search, ShoppingCart, Trash2, UserPlus } from 'lucide-react'

import { useAuth } from '../../../context/AuthContext'
import CenterDialog from '../../../components/CenterDialog'
import { API_URL, getRequestErrorMessage } from '../../../lib/api'
import { canViewPetFinancials, hasPetInventoryMode, isRestrictedPetCashier } from '../../../lib/businessMode'
import { downloadPetInvoicePdf } from '../../../lib/petInvoicePdf'

const entryTypes = [
  { value: 'sale', label: 'Record Sale' },
  { value: 'stock_in', label: 'Add Empty Bottles' },
  { value: 'damage', label: 'Damaged / Waste' },
  { value: 'return_in', label: 'Sale Return' },
]

const emptySaleForm = {
  item_id: '',
  customer_id: '',
  txn_type: 'sale',
  quantity: '',
  unit_price: '',
  invoice_number: '',
  payment_type: 'cash',
  paid_amount: '',
  txn_date: new Date().toISOString().split('T')[0],
  notes: '',
}

const emptyCustomerForm = {
  name: '',
  phone: '',
  address: '',
  customer_type: 'Retail',
  is_active: true,
}

const formatNumber = (value) => Number(value || 0).toLocaleString()
const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString()}`

export default function PetStockPage() {
  const { user, mounted, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptySaleForm)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [dialog, setDialog] = useState({ open: false, type: 'error', title: '', message: '', onConfirm: null, onCancel: null })

  const petMode = hasPetInventoryMode(user)
  const hideFinancials = isRestrictedPetCashier(user)
  const showFinancials = canViewPetFinancials(user)
  const ownerMode = user?.type !== 'staff'
  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items])
  const activeCustomers = useMemo(() => customers.filter((customer) => customer.is_active), [customers])
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()
    if (!query) return activeCustomers.slice(0, 8)
    return activeCustomers
      .filter((customer) => [customer.name, customer.phone, customer.address, customer.customer_type]
        .some((value) => String(value || '').toLowerCase().includes(query)))
      .slice(0, 8)
  }, [activeCustomers, customerSearch])
  const selectedItem = activeItems.find((item) => String(item.id) === String(form.item_id))
  const selectedCustomer = activeCustomers.find((customer) => String(customer.id) === String(form.customer_id))
  const saleTotal = Number(form.quantity || 0) * Number(form.unit_price || selectedItem?.sale_price || 0)

  useEffect(() => {
    if (!mounted || loading) return
    if (!petMode) {
      router.replace('/dashboard')
      return
    }
    loadPage()
  }, [mounted, loading, petMode, router])

  useEffect(() => {
    if (selectedItem && form.txn_type === 'sale' && form.unit_price === '') {
      setForm((prev) => ({ ...prev, unit_price: selectedItem.sale_price ?? '' }))
    }
  }, [selectedItem?.id, form.txn_type])

  const openDialog = (type, title, message) => {
    setDialog({
      open: true,
      type,
      title,
      message,
      onConfirm: () => setDialog((prev) => ({ ...prev, open: false })),
      onCancel: null,
    })
  }

  const loadPage = async () => {
    setPageLoading(true)
    try {
      const [itemsRes, customersRes, summaryRes, txnRes] = await Promise.all([
        axios.get(`${API_URL}/pet/items`),
        axios.get(`${API_URL}/pet/customers`),
        axios.get(`${API_URL}/pet/summary`),
        axios.get(`${API_URL}/pet/transactions`),
      ])
      setItems(itemsRes.data || [])
      setCustomers(customersRes.data || [])
      setSummary(summaryRes.data || null)
      setTransactions(txnRes.data || [])
      setForm((prev) => ({
        ...prev,
        item_id: prev.item_id || itemsRes.data?.find((item) => item.is_active)?.id || '',
        customer_id: prev.customer_id || customersRes.data?.find((customer) => customer.is_active)?.id || '',
      }))
    } catch (err) {
      openDialog('error', 'Sales Entry Error', getRequestErrorMessage(err, 'Unable to load packaged bottle sales data right now.'))
    }
    setPageLoading(false)
  }

  const submitCustomer = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API_URL}/pet/customers`, customerForm)
      openDialog('success', 'Done', 'Customer created successfully.')
      setCustomerForm(emptyCustomerForm)
      setShowCustomerForm(false)
      const customersRes = await axios.get(`${API_URL}/pet/customers`)
      setCustomers(customersRes.data || [])
      setForm((prev) => ({ ...prev, customer_id: res.data?.customer_id || prev.customer_id }))
    } catch (err) {
      openDialog('error', 'Customer Error', getRequestErrorMessage(err, 'Unable to save customer right now.'))
    }
  }

  const submitEntry = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        item_id: Number(form.item_id),
        customer_id: form.txn_type === 'sale' ? Number(form.customer_id) : undefined,
        quantity: Number(form.quantity),
        unit_price: hideFinancials || form.unit_price === '' ? undefined : Number(form.unit_price),
        paid_amount: hideFinancials || form.paid_amount === '' ? undefined : Number(form.paid_amount),
      }
      const res = await axios.post(`${API_URL}/pet/transactions`, payload)
      setForm((prev) => ({
        ...emptySaleForm,
        item_id: prev.item_id,
        customer_id: prev.customer_id,
        txn_type: 'sale',
        txn_date: new Date().toISOString().split('T')[0],
      }))
      openDialog('success', 'Done', res.data?.invoice_number ? `Sale saved. Invoice: ${res.data.invoice_number}` : 'Entry saved successfully.')
      loadPage()
    } catch (err) {
      openDialog('error', 'Sales Entry Error', getRequestErrorMessage(err, 'Unable to save entry right now.'))
    }
    setSaving(false)
  }

  const downloadInvoice = (entry) => {
    downloadPetInvoicePdf(entry, { shopName: user?.shop_name || user?.shopName || 'Water Shop' })
  }

  const deleteEntry = (entry) => {
    const label = entry.txn_type === 'sale'
      ? `invoice ${entry.invoice_number || entry.id}`
      : `${entry.item_name} entry`
    setDialog({
      open: true,
      type: 'confirm',
      title: 'Delete Entry?',
      message: `This will delete ${label}. Stock, revenue, and customer balance will be recalculated automatically.`,
      onConfirm: async () => {
        setDialog((prev) => ({ ...prev, open: false }))
        try {
          const res = await axios.delete(`${API_URL}/pet/transactions/${entry.id}`)
          openDialog('success', 'Done', res.data?.message || 'Entry deleted successfully.')
          loadPage()
        } catch (err) {
          openDialog('error', 'Delete Error', getRequestErrorMessage(err, 'Unable to delete this entry right now.'))
        }
      },
      onCancel: () => setDialog((prev) => ({ ...prev, open: false })),
    })
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
          <p className="text-sm font-medium text-primary">Packaged Bottle Sales</p>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Record filled bottle sales, add empty bottle stock, and keep customer invoice history.</p>
        </div>
        <button onClick={() => setShowCustomerForm((value) => !value)} className="btn btn-secondary inline-flex items-center gap-2">
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      {hideFinancials && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Cashier view hides rupee amounts. Quantity entries and invoices can still be recorded.
        </div>
      )}

      <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        <Metric label="Products" value={summary?.total_products || summary?.total_skus || 0} icon={PackagePlus} />
        <Metric label="Empty Bottles in Stock" value={summary?.current_stock || 0} icon={PackagePlus} />
        <Metric label="Sold Today" value={summary?.today_sales_qty || 0} icon={ShoppingCart} />
        {showFinancials && <Metric label="Today Revenue" value={formatMoney(summary?.today_sales_amount)} icon={Calendar} />}
      </div>

      {showCustomerForm && (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Add Customer</h2>
          </div>
          <form onSubmit={submitCustomer} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Customer Name *">
              <input value={customerForm.name} onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))} className="input" required />
            </Field>
            <Field label="Phone">
              <input value={customerForm.phone} onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))} className="input" />
            </Field>
            <Field label="Customer Type">
              <select value={customerForm.customer_type} onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_type: e.target.value }))} className="input">
                {['Shop', 'Distributor', 'Office', 'Retail'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Address">
              <input value={customerForm.address} onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))} className="input" />
            </Field>
            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
              <button type="submit" className="btn btn-primary flex-1">Save Customer</button>
              <button type="button" onClick={() => setShowCustomerForm(false)} className="btn btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,460px),minmax(0,1fr)]">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">New Sale / Stock Entry</h2>
          </div>
          <form onSubmit={submitEntry} className="space-y-4">
            <Field label="Entry Type *">
              <select value={form.txn_type} onChange={(e) => setForm((prev) => ({ ...prev, txn_type: e.target.value }))} className="input" required>
                {entryTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>

            {form.txn_type === 'sale' && (
              <Field label="Customer *">
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="input pl-10" placeholder="Search customer by name, phone, type..." />
                  </div>
                  <select value={form.customer_id} onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))} className="input" required>
                    <option value="">Select customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name} - {customer.customer_type}{customer.phone ? ` - ${customer.phone}` : ''}</option>
                    ))}
                  </select>
                  {selectedCustomer && <p className="text-xs text-green-700">Selected: {selectedCustomer.name}</p>}
                </div>
              </Field>
            )}

            <Field label="Product *">
              <select value={form.item_id} onChange={(e) => setForm((prev) => ({ ...prev, item_id: e.target.value, unit_price: '' }))} className="input" required>
                <option value="">Select product</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item_name} - {item.size_label} ({formatNumber(item.current_stock)} in stock)
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Quantity *">
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} className="input" required />
              </Field>
              <Field label="Sale Date">
                <input type="date" value={form.txn_date} onChange={(e) => setForm((prev) => ({ ...prev, txn_date: e.target.value }))} className="input" />
              </Field>
            </div>

            {showFinancials && form.txn_type === 'sale' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Unit Price">
                    <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))} className="input" />
                  </Field>
                  <Field label="Invoice Number">
                    <input value={form.invoice_number} onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))} className="input" placeholder="Auto if blank" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Payment Type">
                    <select value={form.payment_type} onChange={(e) => setForm((prev) => ({ ...prev, payment_type: e.target.value }))} className="input">
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                      <option value="partial">Partial</option>
                    </select>
                  </Field>
                  {form.payment_type !== 'cash' && (
                    <Field label="Paid Amount">
                      <input type="number" min="0" step="0.01" value={form.paid_amount} onChange={(e) => setForm((prev) => ({ ...prev, paid_amount: e.target.value }))} className="input" />
                    </Field>
                  )}
                </div>
                <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
                  Invoice total: <strong>{formatMoney(saleTotal)}</strong>
                </div>
              </>
            )}

            {showFinancials && form.txn_type !== 'sale' && (
              <Field label={form.txn_type === 'stock_in' ? 'Cost Price Per Bottle' : 'Reference Price'}>
                <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))} className="input" />
              </Field>
            )}

            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="input" rows={3} />
            </Field>

            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving...' : form.txn_type === 'sale' ? 'Save Sale & Generate Invoice' : 'Save Stock Entry'}
            </button>
          </form>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sales & Empty Bottle Stock</h2>
            <p className="text-sm text-gray-500">Latest activity from packaged bottle module</p>
          </div>
          <div className="space-y-3">
            {transactions.length ? transactions.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{entry.item_name} | {entry.size_label}</p>
                    <p className="mt-1 text-sm text-gray-500">
                    {entry.txn_type === 'stock_in' ? 'Empty bottles added' : entry.txn_type === 'sale' ? 'Sale invoice' : entry.txn_type === 'damage' ? 'Damaged / waste bottles' : 'Sale return'} | {entry.txn_date}
                    </p>
                    {entry.customer_name && <p className="mt-1 text-sm text-gray-600">Customer: {entry.customer_name}</p>}
                    {entry.invoice_number && <p className="mt-1 text-xs text-sky-700">Invoice: {entry.invoice_number}</p>}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(entry.quantity)} bottles</p>
                    {showFinancials && entry.total_amount !== null && entry.txn_type === 'sale' && (
                      <div className="text-sm text-gray-500">
                        <p>{formatMoney(entry.total_amount)}</p>
                        {Number(entry.outstanding_amount || 0) > 0 && (
                          <p className="font-semibold text-red-600">Balance: {formatMoney(entry.outstanding_amount)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:justify-end">
                  {showFinancials && entry.txn_type === 'sale' && (
                    <button
                      type="button"
                      onClick={() => downloadInvoice(entry)}
                      className="btn btn-secondary inline-flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> Download PDF
                    </button>
                  )}
                  {ownerMode && (
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                No sale or stock entry recorded yet.
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
      <p className="mt-1 text-3xl font-bold text-gray-900">{typeof value === 'number' ? formatNumber(value) : value}</p>
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
