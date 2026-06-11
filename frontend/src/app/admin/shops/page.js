'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, X, Edit, Trash2, ToggleLeft, ToggleRight, Lock } from 'lucide-react'

import { API_URL } from '../../../lib/api'
import { BUSINESS_MODES, getBusinessModeLabel } from '../../../lib/businessMode'

const emptyForm = {
  shop_name: '',
  owner_name: '',
  phone: '',
  address: '',
  email: '',
  password: '',
  subscription_type: 'Free Trial',
  duration_days: 7,
  business_mode: BUSINESS_MODES.WATER_19L,
}

export default function ShopsPage() {
  const [shops, setShops] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedShop, setSelectedShop] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [passwordForm, setPasswordForm] = useState({ new_password: '' })
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    loadShops()
    loadPlans()
  }, [])

  const loadShops = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/shops`)
      setShops(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/plans`)
      setPlans(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await axios.put(`${API_URL}/admin/shops/${editId}`, form)
      } else {
        await axios.post(`${API_URL}/admin/shops`, form)
      }
      setShowModal(false)
      setForm(emptyForm)
      setEditId(null)
      loadShops()
    } catch (err) { alert('Error: ' + (err.response?.data?.message || 'Error saving shop')) }
  }

  const handleEdit = (shop) => {
    setForm({
      ...emptyForm,
      ...shop,
      business_mode: shop.business_mode || BUSINESS_MODES.WATER_19L,
      password: '',
    })
    setEditId(shop.id)
    setShowModal(true)
  }

  const openPasswordModal = (shop) => {
    setSelectedShop(shop)
    setPasswordForm({ new_password: '' })
    setShowPasswordModal(true)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!passwordForm.new_password) return alert('Enter new password')
    try {
      await axios.put(`${API_URL}/admin/shops/${selectedShop.id}`, {
        ...selectedShop,
        password: passwordForm.new_password
      })
      alert('Password changed successfully!')
      setShowPasswordModal(false)
    } catch (err) { alert('Error changing password') }
  }

  const handleToggle = async (shop) => {
    try {
      await axios.put(`${API_URL}/admin/shops/${shop.id}`, { ...shop, is_active: !shop.is_active })
      loadShops()
    } catch (err) { alert('Error updating shop') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this shop?')) return
    try {
      await axios.delete(`${API_URL}/admin/shops/${id}`)
      loadShops()
    } catch (err) { alert('Error deleting shop') }
  }

  const getPlanDetails = (shop) => {
    const plan = plans.find(p => p.plan_name.toLowerCase() === shop.subscription_type?.toLowerCase())
    return plan || { customer_limit: 100, price: 0 }
  }

  const isExpired = (expiry) => new Date(expiry) < new Date()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shops Management</h1>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true) }} className="btn btn-primary">
          <Plus size={20} /> Add Shop
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Total Shops</p>
          <p className="text-2xl font-bold">{shops.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">{shops.filter(s => s.is_active).length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Expired</p>
          <p className="text-2xl font-bold text-red-600">{shops.filter(s => isExpired(s.subscription_expiry)).length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Total Customers</p>
          <p className="text-2xl font-bold text-blue-600">{shops.reduce((s, shop) => s + (shop.customer_count || 0), 0)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>Customers</th>
                <th>Package</th>
                <th>Mode</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8">Loading...</td></tr>
              ) : shops.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No shops found</td></tr>
              ) : (
                shops.map(s => {
                  const plan = getPlanDetails(s)
                  return (
                    <tr key={s.id}>
                      <td className="font-medium">{s.shop_name}</td>
                      <td>{s.owner_name}</td>
                      <td>{s.phone}</td>
                      <td>
                        <span className={`badge ${(s.customer_count || 0) >= plan.customer_limit ? 'badge-danger' : 'badge-info'}`}>
                          {s.customer_count || 0} / {plan.customer_limit}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{s.subscription_type?.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          s.business_mode === BUSINESS_MODES.PET_TRADING
                            ? 'badge-warning'
                            : s.business_mode === BUSINESS_MODES.HYBRID
                              ? 'badge-success'
                              : 'badge-info'
                        }`}>
                          {getBusinessModeLabel(s.business_mode)}
                        </span>
                      </td>
                      <td className={isExpired(s.subscription_expiry) ? 'text-red-600 font-medium' : ''}>
                        {s.subscription_expiry}
                      </td>
                      <td>
                        <button onClick={() => handleToggle(s)} className={`flex items-center gap-1 ${s.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {s.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => openPasswordModal(s)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Change Password">
                            <Lock size={18} />
                          </button>
                          <button onClick={() => handleEdit(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Shop Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editId ? 'Edit Shop' : 'Add New Shop'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Shop Name *</label>
                <input type="text" value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Owner Name *</label>
                <input type="text" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" required disabled={!!editId} />
              </div>
              {!editId && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Subscription Package</label>
                <select value={form.subscription_type} onChange={e => {
                  const plan = plans.find(p => p.plan_name.toLowerCase() === e.target.value.toLowerCase())
                  setForm({ ...form, subscription_type: e.target.value, duration_days: plan?.duration_days || 30 })
                }} className="input">
                  {plans.map(p => (
                    <option key={p.id} value={p.plan_name}>
                      {p.plan_name} - Rs {p.price} ({p.customer_limit} customers)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business Mode</label>
                <select
                  value={form.business_mode}
                  onChange={e => setForm({ ...form, business_mode: e.target.value })}
                  className="input"
                >
                  <option value={BUSINESS_MODES.WATER_19L}>Standard Water Delivery</option>
                  <option value={BUSINESS_MODES.PET_TRADING}>PET / Multi-Size Inventory</option>
                  <option value={BUSINESS_MODES.HYBRID}>Hybrid: 19L + PET Inventory</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Standard keeps the 19L workflow. PET is stock/sales only. Hybrid keeps 19L customers, deliveries, invoices, and also enables PET inventory.
                </p>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3">
                {editId ? 'Update' : 'Create'} Shop
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && selectedShop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <p className="text-gray-600">Shop: <strong>{selectedShop.shop_name}</strong></p>
              <p className="text-gray-600">Owner: {selectedShop.owner_name}</p>
              <div>
                <label className="block text-sm font-medium mb-1">New Password *</label>
                <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="input" required />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Change Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
