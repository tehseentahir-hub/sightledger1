'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Edit, Trash2, X, Upload } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import CenterAlert from '../../../components/CenterAlert'
import CenterDialog from '../../../components/CenterDialog'

import { API_URL } from '../../../lib/api'

const initialForm = {
  name: '',
  phone: '',
  address: '',
  bottle_type: '19 Liter',
  rate_per_bottle: 100,
  payment_type: 'cash',
  deposit_bottles: 0,
  security_deposit_amount: 0,
  is_active: true
}

export default function CustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [errorAlert, setErrorAlert] = useState('')
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null })
  const canDelete = user?.type !== 'staff'

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`)
      setCustomers(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await axios.put(`${API_URL}/customers/${editId}`, form)
      } else {
        await axios.post(`${API_URL}/customers`, form)
      }
      setShowModal(false)
      setForm(initialForm)
      setEditId(null)
      loadCustomers()
    } catch (err) {
      setErrorAlert(err.response?.data?.message || 'Unable to save customer right now.')
    }
  }

  const handleEdit = (c) => {
    setForm(c)
    setEditId(c.id)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/customers/${id}`)
      loadCustomers()
    } catch (err) {
      setErrorAlert(err.response?.data?.message || 'Unable to delete customer.')
    }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button onClick={() => { setForm(initialForm); setEditId(null); setShowModal(true) }} className="btn btn-primary whitespace-nowrap">
            <Plus size={20} /> Add
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Payment</th>
                <th>Bottles</th>
                <th>Security Deposit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No customers found</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.bottle_type}</td>
                    <td>Rs {c.rate_per_bottle}</td>
                    <td>
                      <span className={`badge ${c.payment_type === 'cash' ? 'badge-success' : 'badge-warning'}`}>
                        {c.payment_type}
                      </span>
                    </td>
                    <td>{c.deposit_bottles}</td>
                    <td>Rs {Number(c.security_deposit_amount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={18} />
                        </button>
                        {canDelete && (
                          <button onClick={() => setConfirmDialog({ open: true, id: c.id })} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
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
              <h2 className="text-xl font-bold">{editId ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bottle Type</label>
                  <select value={form.bottle_type} onChange={e => setForm({...form, bottle_type: e.target.value})} className="input">
                    <option>19 Liter</option>
                    <option>10 Liter</option>
                    <option>5 Liter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate per Bottle</label>
                  <input type="number" value={form.rate_per_bottle} onChange={e => setForm({...form, rate_per_bottle: Number(e.target.value)})} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Type</label>
                  <select value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})} className="input">
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deposit Bottles</label>
                  <input type="number" value={form.deposit_bottles} onChange={e => setForm({...form, deposit_bottles: Number(e.target.value)})} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Security Deposit Amount (Rs)</label>
                <input type="number" min="0" value={form.security_deposit_amount || 0} onChange={e => setForm({...form, security_deposit_amount: Number(e.target.value)})} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4" />
                <label className="text-sm">Active</label>
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">
                {editId ? 'Update' : 'Add'} Customer
              </button>
            </form>
          </div>
        </div>
      )}
      <CenterAlert open={!!errorAlert} title="Customer Error" message={errorAlert} onClose={() => setErrorAlert('')} />
      <CenterDialog
        open={confirmDialog.open}
        type="confirm"
        title="Delete customer?"
        message="This customer record will be removed permanently."
        onCancel={() => setConfirmDialog({ open: false, id: null })}
        onConfirm={async () => {
          const id = confirmDialog.id
          setConfirmDialog({ open: false, id: null })
          if (id) await handleDelete(id)
        }}
      />
    </div>
  )
}
