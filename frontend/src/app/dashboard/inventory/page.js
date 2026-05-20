'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Package, Plus, X, Users, ArrowRight } from 'lucide-react'
import CenterAlert from '../../../components/CenterAlert'

import { API_URL, getRequestErrorMessage } from '../../../lib/api'

export default function InventoryPage() {
  const [inventory, setInventory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customersWithBottles, setCustomersWithBottles] = useState([])
  const [form, setForm] = useState({ action: 'add', count: 1 })
  const [errorAlert, setErrorAlert] = useState('')

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory`)
      setInventory(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadCustomersWithBottles = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory/by-customer`)
      setCustomersWithBottles(res.data)
      setShowCustomerModal(true)
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.put(`${API_URL}/inventory`, form)
      setShowModal(false)
      setForm({ action: 'add', count: 1 })
      loadInventory()
    } catch (err) { setErrorAlert(getRequestErrorMessage(err, 'Unable to update inventory right now.')) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  const totalWithCustomers = inventory?.bottles_with_customers || 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bottle Inventory</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={20} /> Adjust
        </button>
      </div>

      {/* Visual Flow Representation */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 mb-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 lg:flex lg:items-center lg:justify-between gap-4">
          {/* Total Bottles */}
          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{inventory?.total_bottles || 0}</p>
              <p className="text-sm text-gray-500">Total Bottles</p>
            </div>
          </div>

          <ArrowRight className="w-8 h-8 text-gray-300 flex-shrink-0 hidden lg:block" />

          {/* With Customers - Clickable */}
          <button
            onClick={loadCustomersWithBottles}
            className="flex items-center gap-4 flex-1 min-w-[200px] p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-all"
          >
            <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-purple-600">{totalWithCustomers}</p>
              <p className="text-sm text-purple-700">With Customers</p>
              <p className="text-xs text-purple-500 mt-1">Click to see details</p>
            </div>
          </button>

          <ArrowRight className="w-8 h-8 text-gray-300 flex-shrink-0 hidden lg:block" />

          {/* In Shop */}
          <div className="flex items-center gap-4 flex-1 min-w-[200px] p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{inventory?.bottles_in_shop || 0}</p>
              <p className="text-sm text-green-700">In Shop</p>
            </div>
          </div>

          {/* Lost/Damaged */}
          <div className="flex items-center gap-4 flex-1 min-w-[200px] p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center">
              <X className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{inventory?.lost_damaged || 0}</p>
              <p className="text-sm text-red-700">Lost/Damaged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Bottles with Customers</h2>
                <p className="text-sm text-gray-500">Total: {customersWithBottles.reduce((s, c) => s + c.bottles_outside, 0)} bottles</p>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {customersWithBottles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No bottles with customers
                </div>
              ) : (
                <div className="space-y-3">
                  {customersWithBottles.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold">{customer.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">{customer.bottles_outside}</p>
                        <p className="text-xs text-gray-500">bottles</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-xl w-full max-w-md h-[100dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Adjust Inventory</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <select value={form.action} onChange={e => setForm({...form, action: e.target.value})} className="input">
                  <option value="add">Add New Bottles</option>
                  <option value="lost">Mark as Lost/Damaged</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of Bottles</label>
                <input type="number" min="1" value={form.count} onChange={e => setForm({...form, count: Number(e.target.value)})} className="input" required />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Update Inventory</button>
            </form>
          </div>
        </div>
      )}
      <CenterAlert open={!!errorAlert} title="Inventory Error" message={errorAlert} onClose={() => setErrorAlert('')} />
    </div>
  )
}

