'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { AlertTriangle, Edit, Package, Plus, Trash2 } from 'lucide-react'

import { useAuth } from '../../../context/AuthContext'
import CenterDialog from '../../../components/CenterDialog'
import { API_URL, getRequestErrorMessage } from '../../../lib/api'
import { canViewPetFinancials, hasPetInventoryMode } from '../../../lib/businessMode'

const emptyProduct = {
  item_name: '',
  category: 'Empty PET Bottle',
  size_label: '',
  unit_type: 'bottles',
  opening_stock: '',
  min_stock_alert: '20',
  cost_price: '',
  sale_price: '',
  is_active: true,
}

const formatNumber = (value) => Number(value || 0).toLocaleString()
const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString()}`

export default function PetItemsPage() {
  const { user, mounted, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState([])
  const [pageLoading, setPageLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [dialog, setDialog] = useState({ open: false, type: 'error', title: '', message: '', onConfirm: null, onCancel: null })

  const petMode = hasPetInventoryMode(user)
  const ownerMode = user?.type !== 'staff'
  const showFinancials = canViewPetFinancials(user)
  const activeItems = useMemo(() => items.filter((item) => item.is_active), [items])
  const lowStockItems = useMemo(
    () => activeItems.filter((item) => Number(item.current_stock || 0) <= Number(item.min_stock_alert || 20)),
    [activeItems]
  )

  useEffect(() => {
    if (!mounted || loading) return
    if (!petMode) {
      router.replace('/dashboard')
      return
    }
    loadItems()
  }, [mounted, loading, petMode, router])

  const openDialog = (type, title, message, onConfirm = null, onCancel = null) => {
    setDialog({
      open: true,
      type,
      title,
      message,
      onConfirm: onConfirm || (() => setDialog((prev) => ({ ...prev, open: false }))),
      onCancel,
    })
  }

  const loadItems = async () => {
    setPageLoading(true)
    try {
      const res = await axios.get(`${API_URL}/pet/items`)
      setItems(res.data || [])
    } catch (err) {
      openDialog('error', 'Product Error', getRequestErrorMessage(err, 'Unable to load products right now.'))
    }
    setPageLoading(false)
  }

  const openCreate = () => {
    setEditingItem(null)
    setForm(emptyProduct)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      item_name: item.item_name || '',
      category: item.category || 'Empty PET Bottle',
      size_label: item.size_label || '',
      unit_type: item.unit_type || 'bottles',
      opening_stock: item.opening_stock ?? '',
      min_stock_alert: item.min_stock_alert ?? '20',
      cost_price: item.cost_price ?? '',
      sale_price: item.sale_price ?? '',
      is_active: Boolean(item.is_active),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setForm(emptyProduct)
  }

  const submitItem = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        opening_stock: form.opening_stock === '' ? 0 : Number(form.opening_stock),
        min_stock_alert: form.min_stock_alert === '' ? 0 : Number(form.min_stock_alert),
        cost_price: form.cost_price === '' ? 0 : Number(form.cost_price),
        sale_price: form.sale_price === '' ? 0 : Number(form.sale_price),
      }

      if (editingItem) {
        await axios.put(`${API_URL}/pet/items/${editingItem.id}`, payload)
        openDialog('success', 'Done', 'Product updated successfully.')
      } else {
        await axios.post(`${API_URL}/pet/items`, payload)
        openDialog('success', 'Done', 'Product created successfully.')
      }
      closeModal()
      loadItems()
    } catch (err) {
      openDialog('error', 'Product Error', getRequestErrorMessage(err, 'Unable to save product right now.'))
    }
  }

  const archiveItem = (item) => {
    openDialog(
      'confirm',
      'Archive Product?',
      `This will hide ${item.item_name} from new sales entries. Existing sales history will remain safe.`,
      async () => {
        setDialog((prev) => ({ ...prev, open: false }))
        try {
          await axios.delete(`${API_URL}/pet/items/${item.id}`)
          openDialog('success', 'Done', 'Product archived successfully.')
          loadItems()
        } catch (err) {
          openDialog('error', 'Product Error', getRequestErrorMessage(err, 'Unable to archive product right now.'))
        }
      },
      () => setDialog((prev) => ({ ...prev, open: false }))
    )
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Packaged Bottle Products</p>
          <h1 className="text-2xl font-bold text-gray-900">Product Master</h1>
          <p className="mt-1 text-sm text-gray-500">Add empty bottle sizes used for filling, sealing, and selling from your plant.</p>
        </div>
        {ownerMode && (
          <button onClick={openCreate} className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      {!ownerMode && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Cashier can view products and record sales. Product setup remains owner-only.
        </div>
      )}

      <div className={`grid gap-4 ${showFinancials ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        <SummaryCard label="Active Products" value={activeItems.length} />
        <SummaryCard label="Bottles in Stock" value={activeItems.reduce((sum, item) => sum + Number(item.current_stock || 0), 0)} />
        <SummaryCard label="Low Stock Alerts" value={lowStockItems.length} />
        {showFinancials && (
          <SummaryCard label="Stock Value" value={formatMoney(activeItems.reduce((sum, item) => sum + (Number(item.current_stock || 0) * Number(item.cost_price || 0)), 0))} />
        )}
      </div>

      <div className="space-y-4">
        {items.length ? items.map((item) => {
          const isLow = Number(item.current_stock || 0) <= Number(item.min_stock_alert || 20)
          return (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isLow ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                    {isLow ? <AlertTriangle size={20} /> : <Package size={20} />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{item.item_name}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.size_label}</span>
                      {isLow && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Low stock</span>}
                      {!item.is_active && <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-600">Archived</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{item.category} | {item.unit_type}</p>
                  </div>
                </div>
                {ownerMode && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="Edit product">
                      <Edit size={18} />
                    </button>
                    {item.is_active && (
                      <button onClick={() => archiveItem(item)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Archive product">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className={`mt-4 grid gap-3 ${showFinancials ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-3'}`}>
                <MiniStat label="Current Stock" value={formatNumber(item.current_stock)} />
                <MiniStat label="Minimum Alert" value={formatNumber(item.min_stock_alert)} />
                <MiniStat label="Opening Stock" value={formatNumber(item.opening_stock)} />
                {showFinancials && <MiniStat label="Selling Price" value={formatMoney(item.sale_price)} />}
                {showFinancials && <MiniStat label="Cost Price" value={formatMoney(item.cost_price)} />}
              </div>
            </div>
          )
        }) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            No product added yet.
          </div>
        )}
      </div>

      {showModal && ownerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl max-h-[95svh]">
            <div className="border-b px-5 py-4 sm:px-6">
              <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Product' : 'Add Product'}</h2>
              <p className="mt-1 text-sm text-gray-500">Use simple product names such as 500ml Bottle, 1.5L Bottle, or 6L Bottle.</p>
            </div>
            <form onSubmit={submitItem} className="space-y-4 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Product Name *">
                  <input value={form.item_name} onChange={(e) => setForm((prev) => ({ ...prev, item_name: e.target.value }))} className="input" placeholder="500ml Bottle" required />
                </Field>
                <Field label="Bottle Size *">
                  <input value={form.size_label} onChange={(e) => setForm((prev) => ({ ...prev, size_label: e.target.value }))} className="input" placeholder="500ml, 1.5L, 6L" required />
                </Field>
                <Field label="Current / Opening Stock">
                  <input type="number" min="0" value={form.opening_stock} onChange={(e) => setForm((prev) => ({ ...prev, opening_stock: e.target.value }))} className="input" placeholder="1000" />
                </Field>
                <Field label="Minimum Stock Alert">
                  <input type="number" min="0" value={form.min_stock_alert} onChange={(e) => setForm((prev) => ({ ...prev, min_stock_alert: e.target.value }))} className="input" placeholder="100" />
                </Field>
                <Field label="Selling Price Per Bottle">
                  <input type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => setForm((prev) => ({ ...prev, sale_price: e.target.value }))} className="input" placeholder="25" />
                </Field>
                <Field label="Cost Price Per Empty Bottle">
                  <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((prev) => ({ ...prev, cost_price: e.target.value }))} className="input" placeholder="12" />
                </Field>
                <Field label="Category">
                  <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="input" />
                </Field>
                <Field label="Unit">
                  <input value={form.unit_type} onChange={(e) => setForm((prev) => ({ ...prev, unit_type: e.target.value }))} className="input" />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                Active product
              </label>

              <div className="sticky bottom-0 -mx-5 -mb-5 border-t bg-white p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className="btn btn-primary flex-1">{editingItem ? 'Update Product' : 'Create Product'}</button>
                  <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
