'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, X, Calendar, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useAuth } from '../../../context/AuthContext'

import { API_URL } from '../../../lib/api'

export default function DeliveriesPage() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState([])
  const [customers, setCustomers] = useState([])
  const [riders, setRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceCustomer, setInvoiceCustomer] = useState(null)
  const [form, setForm] = useState({
    customer_id: '',
    is_walkin: false,
    walkin_name: '',
    walkin_rate_per_bottle: 100,
    rider_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    bottles_delivered: 1,
    bottles_returned: 0,
    delivery_type: 'home_delivery',
    notes: ''
  })
  const [filter, setFilter] = useState({
    start_date: '',
    end_date: ''
  })
  const [customerSearch, setCustomerSearch] = useState('')

  const canDelete = user?.role === 'shop_owner' || user?.role === 'super_admin'
  const defaultRefillRate = Number(user?.default_refill_rate || 100)

  useEffect(() => {
    loadCustomers()
    loadRiders()
    loadDeliveries()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`)
      setCustomers(res.data.filter(c => c.is_active))
    } catch (err) { console.error(err) }
  }

  const loadRiders = async () => {
    try {
      const res = await axios.get(`${API_URL}/staff`)
      setRiders(res.data.filter(s => s.role === 'rider' && s.is_active))
    } catch (err) { console.error(err) }
  }

  const loadDeliveries = async () => {
    try {
      const params = {}
      if (filter.start_date) params.start_date = filter.start_date
      if (filter.end_date) params.end_date = filter.end_date

      const res = await axios.get(`${API_URL}/deliveries`, { params })
      setDeliveries(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.bottles_delivered || form.bottles_delivered < 1) return alert('Enter bottles delivered')
    if (!form.is_walkin && !form.customer_id) return alert('Please select a customer from search results')

    try {
      const deliveryData = {
        customer_id: form.is_walkin ? 1 : form.customer_id, // Use ID 1 for walk-in or actual customer
        is_walkin: form.is_walkin,
        walkin_name: form.is_walkin ? form.walkin_name : null,
        walkin_rate_per_bottle: form.is_walkin ? form.walkin_rate_per_bottle : null,
        rider_id: form.is_walkin ? null : (form.rider_id || null),
        delivery_date: form.delivery_date,
        bottles_delivered: form.bottles_delivered,
        bottles_returned: form.is_walkin ? 0 : (form.bottles_returned || 0),
        delivery_type: form.is_walkin ? 'walk_in' : form.delivery_type,
        notes: form.notes
      }

      const res = await axios.post(`${API_URL}/deliveries`, deliveryData)
      console.log('Delivery created:', res.data)

      setShowModal(false)
      setForm({
        customer_id: '',
        is_walkin: false,
        walkin_name: '',
        walkin_rate_per_bottle: defaultRefillRate,
        rider_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        bottles_delivered: 1,
        bottles_returned: 0,
        delivery_type: 'home_delivery',
        notes: ''
      })
      setCustomerSearch('')
      loadDeliveries()
    } catch (err) {
      console.error(err)
      alert('Error: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this delivery?')) return
    try {
      await axios.delete(`${API_URL}/deliveries/${id}`)
      loadDeliveries()
      loadCustomers()
    } catch (err) { alert('Error deleting delivery') }
  }

  const openInvoice = (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      setInvoiceCustomer(customer)
      setShowInvoiceModal(true)
    }
  }

  const generateInvoice = async (customerId, dateRange = 'all') => {
    try {
      let params = { customer_id: customerId }
      if (dateRange !== 'all' && filter.start_date && filter.end_date) {
        params.start_date = filter.start_date
        params.end_date = filter.end_date
      }

      const res = await axios.get(`${API_URL}/deliveries`, { params })
      const deliveries = res.data.filter(d => d.customer_id === customerId)

      const customer = customers.find(c => c.id === customerId)

      if (!deliveries.length) {
        alert('No deliveries found')
        return
      }

      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text('INVOICE / DELIVERY RECORD', 105, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.text(`Customer: ${customer.name}`, 20, 40)
      doc.text(`Phone: ${customer.phone || 'N/A'}`, 20, 48)
      doc.text(`Rate: Rs ${customer.rate_per_bottle}`, 20, 56)

      const tableData = deliveries.map(d => [
        d.delivery_date,
        d.bottles_delivered,
        d.bottles_returned,
        d.bottles_delivered - d.bottles_returned,
        d.delivery_type === 'home_delivery' ? 'Home' : 'Walk-in',
        d.rider_name || '-',
        `Rs ${(d.bottles_delivered * d.rate_per_bottle).toLocaleString()}`
      ])

      doc.autoTable({
        startY: 65,
        head: [['Date', 'Delivered', 'Returned', 'Net', 'Type', 'Rider', 'Amount']],
        body: tableData,
      })

      const finalY = doc.lastAutoTable.finalY + 10
      const totalBottles = deliveries.reduce((sum, d) => sum + d.bottles_delivered, 0)
      const totalAmount = deliveries.reduce((sum, d) => sum + (d.bottles_delivered * d.rate_per_bottle), 0)

      doc.setFontSize(12)
      doc.text(`Total: ${totalBottles} bottles - Rs ${totalAmount.toLocaleString()}`, 20, finalY)

      doc.save(`invoice_${customer.name}.pdf`)
      setShowInvoiceModal(false)
    } catch (err) {
      alert('Error generating invoice')
    }
  }

  const totalBottles = deliveries.reduce((s, d) => s + d.bottles_delivered, 0)
  const totalReturned = deliveries.reduce((s, d) => s + d.bottles_returned, 0)
  const homeDeliveries = deliveries.filter(d => d.delivery_type === 'home_delivery').length
  const walkInDeliveries = deliveries.filter(d => d.delivery_type === 'walk_in').length
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return true
    return (
      c.name?.toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q) ||
      String(c.address || '').toLowerCase().includes(q)
    )
  })
  const quickPickCustomers = filteredCustomers.slice(0, 8)
  const selectedCustomer = customers.find(c => Number(c.id) === Number(form.customer_id))

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" />
            <input type="date" value={filter.start_date} onChange={e => setFilter({...filter, start_date: e.target.value})} className="input w-36" placeholder="From" />
            <span className="text-gray-400">to</span>
            <input type="date" value={filter.end_date} onChange={e => setFilter({...filter, end_date: e.target.value})} className="input w-36" placeholder="To" />
          </div>
          <button onClick={loadDeliveries} className="btn btn-secondary">Filter</button>
          <button onClick={() => { setForm({ customer_id: '', is_walkin: false, walkin_name: '', walkin_rate_per_bottle: defaultRefillRate, rider_id: '', delivery_date: new Date().toISOString().split('T')[0], bottles_delivered: 1, bottles_returned: 0, delivery_type: 'home_delivery', notes: '' }); setCustomerSearch(''); setShowModal(true) }} className="btn btn-primary">
            <Plus size={20} /> Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-2xl font-bold text-primary">{deliveries.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Home</p>
          <p className="text-2xl font-bold text-blue-600">{homeDeliveries}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Walk-in (Cash)</p>
          <p className="text-2xl font-bold text-green-600">{walkInDeliveries}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Bottles</p>
          <p className="text-2xl font-bold text-purple-600">{totalBottles}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-gray-500 text-sm">Returned</p>
          <p className="text-2xl font-bold text-teal-600">{totalReturned}</p>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Rider</th>
                <th>Delivered</th>
                <th>Returned</th>
                <th>Net</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8">Loading...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">No deliveries</td></tr>
              ) : (
                deliveries.map(d => (
                  <tr key={d.id}>
                    <td>{d.delivery_date}</td>
                    <td className="font-medium">{d.customer_name || (d.delivery_type === 'walk_in' ? 'Walk-in' : '-')}</td>
                    <td>{d.rider_name || '-'}</td>
                    <td className="text-blue-600">+{d.bottles_delivered}</td>
                    <td className="text-green-600">-{d.bottles_returned}</td>
                    <td className="font-bold">{d.bottles_delivered - d.bottles_returned}</td>
                    <td>
                      <span className={`badge ${d.delivery_type === 'home_delivery' ? 'badge-info' : 'badge-success'}`}>
                        {d.delivery_type === 'home_delivery' ? 'Home' : 'Walk-in'}
                      </span>
                    </td>
                    <td>
                      {d.delivery_type === 'walk_in' ? (
                        <span className="text-gray-400">Cash</span>
                      ) : (
                        `Rs ${((d.bottles_delivered || 0) * (d.rate_per_bottle || 0)).toLocaleString()}`
                      )}
                    </td>
                    <td>
                      {d.delivery_type !== 'walk_in' && (
                        <button onClick={() => openInvoice(d.customer_id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <FileText size={18} />
                        </button>
                      )}
                    </td>
                    <td>
                      {canDelete ? (
                        <button onClick={() => handleDelete(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X size={18} />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">New Delivery</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Walk-in Toggle */}
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_walkin"
                  checked={form.is_walkin}
                  onChange={e => {
                    setForm({
                      ...form,
                      is_walkin: e.target.checked,
                      customer_id: e.target.checked ? '' : form.customer_id,
                      delivery_type: e.target.checked ? 'walk_in' : 'home_delivery',
                      bottles_returned: e.target.checked ? 0 : form.bottles_returned,
                      rider_id: e.target.checked ? '' : form.rider_id,
                      walkin_rate_per_bottle: e.target.checked ? defaultRefillRate : form.walkin_rate_per_bottle
                    })
                    if (e.target.checked) setCustomerSearch('')
                  }}
                  className="w-5 h-5"
                />
                <label htmlFor="is_walkin" className="font-medium text-yellow-800">
                  Walk-in Customer (Pays Cash on the spot)
                </label>
              </div>

              {form.is_walkin ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={form.walkin_name}
                    onChange={e => setForm({...form, walkin_name: e.target.value})}
                    className="input"
                    placeholder="Enter customer name or just 'Walk-in'"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cash customer, tracked as walk-in sale</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Search Customer *</label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value)
                      setForm({...form, customer_id: ''})
                    }}
                    className="input"
                    placeholder="Type name, phone, or address..."
                  />
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-auto">
                    {quickPickCustomers.length === 0 ? (
                      selectedCustomer ? (
                        <div className="px-3 py-2 text-sm">
                          <span className="font-medium">{selectedCustomer.name}</span>
                          <span className="text-gray-500"> - {selectedCustomer.phone || 'No phone'} - Rs {selectedCustomer.rate_per_bottle}/bottle</span>
                        </div>
                      ) : (
                        <p className="px-3 py-2 text-sm text-gray-500">No customer found</p>
                      )
                    ) : (
                      quickPickCustomers.map(c => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setForm({...form, customer_id: c.id})
                            setCustomerSearch(`${c.name} - ${c.phone || 'No phone'}`)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${Number(form.customer_id) === Number(c.id) ? 'bg-blue-50' : ''}`}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500"> - {c.phone || 'No phone'} - Rs {c.rate_per_bottle}/bottle</span>
                        </button>
                      ))
                    )}
                  </div>
                  {!!form.customer_id && <p className="mt-1 text-xs text-green-700">Customer selected</p>}
                </div>
              )}

              {form.is_walkin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Per Bottle (Cash) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.walkin_rate_per_bottle}
                    onChange={e => setForm({...form, walkin_rate_per_bottle: Number(e.target.value)})}
                    className="input"
                    required
                  />
                </div>
              )}

              {!form.is_walkin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Rider (Optional)</label>
                  <select value={form.rider_id} onChange={e => setForm({...form, rider_id: e.target.value})} className="input">
                    <option value="">Select Rider</option>
                    {riders.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} className="input" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{form.is_walkin ? 'Refill Bottles *' : 'Bottles Delivered *'}</label>
                  <input type="number" min="1" value={form.bottles_delivered} onChange={e => setForm({...form, bottles_delivered: Number(e.target.value)})} className="input" required />
                </div>
                {!form.is_walkin && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Bottles Returned</label>
                    <input type="number" min="0" value={form.bottles_returned} onChange={e => setForm({...form, bottles_returned: Number(e.target.value)})} className="input" />
                  </div>
                )}
              </div>
              {!form.is_walkin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Type</label>
                  <select value={form.delivery_type} onChange={e => setForm({...form, delivery_type: e.target.value})} className="input">
                    <option value="home_delivery">Home Delivery (Credit)</option>
                    <option value="walk_in">Walk-in Refill (Cash)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows={2} />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Record Delivery</button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Generate Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p>Invoice for: <strong>{invoiceCustomer.name}</strong></p>
              <p>Rate: Rs {invoiceCustomer.rate_per_bottle}/bottle</p>
              <div className="flex gap-2 pt-4">
                <button onClick={() => generateInvoice(invoiceCustomer.id, 'all')} className="btn btn-primary flex-1">Full Invoice</button>
                <button onClick={() => generateInvoice(invoiceCustomer.id, 'filtered')} className="btn btn-secondary flex-1">Filtered</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
