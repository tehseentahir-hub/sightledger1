'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, X } from 'lucide-react'
import CenterAlert from '../../../components/CenterAlert'

import { API_URL, getRequestErrorMessage } from '../../../lib/api'

const expenseTypes = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'salary', label: 'Salary' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'bottles_purchase', label: 'Bottles Purchase' },
  { value: 'caps', label: 'Caps' },
  { value: 'seals', label: 'Seals' },
  { value: 'labels', label: 'Labels' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
]

const expenseTypeLabel = expenseTypes.reduce((map, type) => ({ ...map, [type.value]: type.label }), {})

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    expense_type: 'fuel',
    amount: '',
    paid_amount: '',
    supplier_name: '',
    supplier_phone: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  })
  const [summary, setSummary] = useState(null)
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [errorAlert, setErrorAlert] = useState('')

  useEffect(() => {
    loadExpenses()
    loadSummary()
  }, [filter])

  const loadExpenses = async () => {
    try {
      const startDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-01`
      const endDate = new Date(filter.year, filter.month, 0).toISOString().split('T')[0]
      const res = await axios.get(`${API_URL}/expenses`, { params: { start_date: startDate, end_date: endDate } })
      setExpenses(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses/summary`, { params: filter })
      setSummary(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/expenses`, form)
      setShowModal(false)
      setForm({
        expense_type: 'fuel',
        amount: '',
        paid_amount: '',
        supplier_name: '',
        supplier_phone: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
      })
      loadExpenses()
      loadSummary()
    } catch (err) { setErrorAlert(getRequestErrorMessage(err, 'Unable to record expense right now.')) }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalPaid = expenses.reduce((s, e) => s + Number(e.paid_amount ?? e.amount), 0)
  const totalPayable = expenses.reduce((s, e) => s + Number(e.outstanding_amount || 0), 0)
  const formAmount = Number(form.amount || 0)
  const formPaid = form.paid_amount === '' ? formAmount : Number(form.paid_amount || 0)
  const formBalance = Math.max(0, formAmount - formPaid)

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="grid grid-cols-3 sm:flex gap-2 items-center w-full lg:w-auto">
          <select value={filter.month} onChange={e => setFilter({...filter, month: Number(e.target.value)})} className="input w-full sm:w-24">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'short' })}</option>
            ))}
          </select>
          <select value={filter.year} onChange={e => setFilter({...filter, year: Number(e.target.value)})} className="input w-full sm:w-24">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={20} /> Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Total Bills</p>
          <p className="text-2xl font-bold text-red-600">Rs {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Paid</p>
          <p className="text-2xl font-bold text-green-600">Rs {totalPaid.toLocaleString()}</p>
        </div>
        <div className="card p-4 text-center col-span-2 lg:col-span-1">
          <p className="text-gray-500 text-sm">Supplier Payables</p>
          <p className="text-2xl font-bold text-orange-600">Rs {Number(summary?.supplier_payables ?? totalPayable).toLocaleString()}</p>
        </div>
        {expenseTypes.map(t => {
          const typeExp = summary?.summary?.find(s => s.expense_type === t.value)
          return (
            <div key={t.value} className="card p-4 text-center">
              <p className="text-gray-500 text-sm">{t.label}</p>
              <p className="text-xl font-bold">Rs {(typeExp?.total || 0).toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      {/* Expenses List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Description</th>
                <th>Total Bill</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No expenses found</td></tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>
                      <span className="badge badge-info">{expenseTypeLabel[e.expense_type] || e.expense_type}</span>
                    </td>
                    <td>
                      <div className="min-w-32">
                        <p className="font-medium">{e.supplier_name || '-'}</p>
                        {e.supplier_phone && <p className="text-xs text-gray-500">{e.supplier_phone}</p>}
                      </div>
                    </td>
                    <td>{e.description || '-'}</td>
                    <td className="font-bold text-red-600">Rs {Number(e.amount).toLocaleString()}</td>
                    <td className="font-bold text-green-600">Rs {Number(e.paid_amount ?? e.amount).toLocaleString()}</td>
                    <td className={Number(e.outstanding_amount || 0) > 0 ? 'font-bold text-orange-600' : 'text-gray-500'}>
                      Rs {Number(e.outstanding_amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-xl w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.expense_type} onChange={e => setForm({...form, expense_type: e.target.value})} className="input">
                  {expenseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Name</label>
                  <input type="text" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className="input" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Phone</label>
                  <input type="text" value={form.supplier_phone} onChange={e => setForm({...form, supplier_phone: e.target.value})} className="input" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Bill Amount *</label>
                <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paid Amount</label>
                <input type="number" min="0" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} className="input" placeholder="Leave blank if fully paid" />
                <p className="mt-1 text-xs text-gray-500">
                  Remaining balance: Rs {Number.isFinite(formBalance) ? formBalance.toLocaleString() : 0}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input" rows={2} />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Add Expense</button>
            </form>
          </div>
        </div>
      )}
      <CenterAlert open={!!errorAlert} title="Expense Error" message={errorAlert} onClose={() => setErrorAlert('')} />
    </div>
  )
}
