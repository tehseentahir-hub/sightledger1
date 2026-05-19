'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, X } from 'lucide-react'

import { API_URL } from '../../../lib/api'

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ plan_name: '', duration_days: 30, price: 0, customer_limit: 100 })

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/plans`)
      setPlans(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/admin/plans`, form)
      setShowModal(false)
      setForm({ plan_name: '', duration_days: 30, price: 0, customer_limit: 100 })
      loadPlans()
    } catch (err) { alert('Error creating plan') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={20} /> Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center py-8">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-4 text-center py-8 text-gray-400">No plans found</div>
        ) : (
          plans.map(p => (
            <div key={p.id} className="card p-6">
              <h3 className="font-bold text-lg mb-2">{p.plan_name}</h3>
              <p className="text-3xl font-bold text-primary mb-2">Rs {Number(p.price).toLocaleString()}</p>
              <p className="text-gray-500">{p.duration_days} days</p>
              <p className="text-sm text-gray-400 mt-2">Max customers: {p.customer_limit}</p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Add Plan</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan Name</label>
                <input type="text" value={form.plan_name} onChange={e => setForm({...form, plan_name: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (days)</label>
                <input type="number" value={form.duration_days} onChange={e => setForm({...form, duration_days: Number(e.target.value)})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (Rs)</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customer Limit</label>
                <input type="number" value={form.customer_limit} onChange={e => setForm({...form, customer_limit: Number(e.target.value)})} className="input" required />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Create Plan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
