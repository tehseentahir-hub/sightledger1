'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, X, FileText, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import jsPDF from 'jspdf'

import { API_URL } from '../../../lib/api'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [outstandingData, setOutstandingData] = useState({ outstanding: [], advances: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLedger, setShowLedger] = useState(null)
  const [ledgerData, setLedgerData] = useState(null)
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'partial',
    notes: ''
  })
  const [activeTab, setActiveTab] = useState('outstanding')
  const [selectedSummary, setSelectedSummary] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')

  useEffect(() => {
    loadCustomers()
    loadPayments()
    loadOutstanding()
  }, [])

  // When a customer is selected in modal, fetch accurate ledger summary (billed/paid/balance)
  useEffect(() => {
    const cid = form.customer_id ? Number(form.customer_id) : null
    if (!cid) {
      setSelectedSummary(null)
      return
    }
    ;(async () => {
      try {
        const res = await axios.get(`${API_URL}/payments/customer/${cid}`)
        setSelectedSummary(res.data)
      } catch {
        setSelectedSummary(null)
      }
    })()
  }, [form.customer_id])

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`)
      setCustomers(res.data.filter(c => c.is_active))
    } catch (err) { console.error(err) }
  }

  const loadPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/payments`)
      setPayments(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadOutstanding = async () => {
    try {
      const res = await axios.get(`${API_URL}/payments/outstanding`)
      setOutstandingData(res.data)
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customer_id) return alert('Select a customer')

    // Show current pending before payment
    const customer = customers.find(c => c.id === parseInt(form.customer_id))
    const outstanding = outstandingData.outstanding.find(o => o.id === parseInt(form.customer_id))
    const pendingAmount = Number(outstanding?.outstanding || 0)
    const payAmount = Number(form.amount || 0)

    if (form.payment_type === 'partial') {
      if (!confirm(`Current pending: Rs ${pendingAmount.toLocaleString()}\nPayment amount: Rs ${payAmount.toLocaleString()}\nRemaining after payment: Rs ${Math.max(0, pendingAmount - payAmount).toLocaleString()}`)) {
        return
      }
    }

    try {
      await axios.post(`${API_URL}/payments`, { ...form, amount: payAmount })
      setShowModal(false)
      setForm({ customer_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_type: 'partial', notes: '' })
      setCustomerSearch('')
      loadPayments()
      loadOutstanding()
      alert('Payment recorded successfully!')
    } catch (err) { alert('Error: ' + (err.response?.data?.message || 'Error recording payment')) }
  }

  const viewLedger = async (customerId) => {
    try {
      const res = await axios.get(`${API_URL}/payments/customer/${customerId}`)
      setLedgerData(res.data)
      setShowLedger(customerId)
    } catch (err) { alert('Error loading ledger') }
  }

  const getCustomerWithBalance = (customerId) => {
    const outstanding = outstandingData.outstanding.find(o => o.id === customerId)
    const advance = outstandingData.advances.find(a => a.id === customerId)

    if (advance && advance.advance > 0) {
      return { type: 'advance', amount: advance.advance, bottles: advance.total_bottles }
    }
    if (outstanding && outstanding.outstanding > 0) {
      return { type: 'pending', amount: outstanding.outstanding, bottles: outstanding.total_bottles }
    }
    return { type: 'clear', amount: 0, bottles: 0 }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return true
    return String(c.name || '').toLowerCase().includes(q) || String(c.phone || '').toLowerCase().includes(q)
  })
  const quickPickCustomers = filteredCustomers.slice(0, 8)
  const selectedCustomer = customers.find(c => Number(c.id) === Number(form.customer_id))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <button onClick={() => { setShowModal(true); setCustomerSearch('') }} className="btn btn-primary">
          <Plus size={20} /> Record Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('outstanding')} className={`px-4 py-2 rounded-lg ${activeTab === 'outstanding' ? 'bg-primary text-white' : 'bg-white'}`}>
          Pending Payments ({outstandingData.outstanding.length})
        </button>
        <button onClick={() => setActiveTab('advances')} className={`px-4 py-2 rounded-lg ${activeTab === 'advances' ? 'bg-primary text-white' : 'bg-white'}`}>
          Advance Paid ({outstandingData.advances.length})
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg ${activeTab === 'history' ? 'bg-primary text-white' : 'bg-white'}`}>
          Payment History
        </button>
      </div>

      {/* Outstanding Tab */}
      {activeTab === 'outstanding' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Bottles</th>
                  <th>Pending Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {outstandingData.outstanding.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No pending payments</td></tr>
                ) : (
                  outstandingData.outstanding.map(c => {
                    const balance = getCustomerWithBalance(c.id)
                    return (
                      <tr key={c.id}>
                        <td className="font-medium">{c.name}</td>
                        <td>{c.phone || '-'}</td>
                        <td>{c.total_bottles}</td>
                        <td className="font-bold text-red-600">Rs {Number(c.outstanding).toLocaleString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => viewLedger(c.id)} className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200">Ledger</button>
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
      )}

      {/* Advances Tab */}
      {activeTab === 'advances' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Bottles</th>
                  <th>Advance Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {outstandingData.advances.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No advance payments</td></tr>
                ) : (
                  outstandingData.advances.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.total_bottles}</td>
                      <td className="font-bold text-green-600">Rs {Number(c.advance).toLocaleString()}</td>
                      <td>
                        <button onClick={() => viewLedger(c.id)} className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded">Ledger</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payments found</td></tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.payment_date}</td>
                      <td>{p.customer_name}</td>
                      <td className="font-bold text-green-600">Rs {Number(p.amount).toLocaleString()}</td>
                      <td><span className={`badge ${p.payment_type === 'full' ? 'badge-success' : 'badge-warning'}`}>{p.payment_type}</span></td>
                      <td>{p.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedger && ledgerData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Ledger - {ledgerData.customer.name}</h2>
              <button onClick={() => setShowLedger(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6">
              <div className={`p-4 rounded-lg mb-4 ${ledgerData.current_balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-lg">
                  {ledgerData.current_balance > 0 ? (
                    <>Pending: <span className="font-bold text-red-600">Rs {ledgerData.current_balance.toLocaleString()}</span></>
                  ) : (
                    <>Advance: <span className="font-bold text-green-600">Rs {Math.abs(ledgerData.current_balance).toLocaleString()}</span></>
                  )}
                </p>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Bottles</th>
                    <th>Amount</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.ledger.map(l => (
                    <tr key={l.id}>
                      <td>{l.date}</td>
                      <td><span className={`badge ${l.type === 'delivery' ? 'badge-info' : 'badge-success'}`}>{l.type}</span></td>
                      <td>{l.bottles_delivered || '-'}</td>
                      <td className={l.type === 'payment' ? 'text-green-600' : ''}>Rs {Number(l.amount || 0).toLocaleString()}</td>
                      <td className="font-bold">Rs {l.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setForm({...form, customer_id: ''})
                  }}
                  className="input mb-2"
                  placeholder="Search by name or phone..."
                />
                <div className="border border-gray-200 rounded-lg max-h-52 overflow-auto">
                  {quickPickCustomers.length === 0 ? (
                    selectedCustomer ? (
                      <div className="px-3 py-2 text-sm">
                        <span className="font-medium">{selectedCustomer.name}</span>
                        <span className="text-gray-500"> - {selectedCustomer.phone || 'No phone'}</span>
                      </div>
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500">No customer found</p>
                    )
                  ) : (
                    quickPickCustomers.map(c => {
                      const balance = getCustomerWithBalance(c.id)
                      const balanceText = balance.type === 'pending'
                        ? `Pending Rs ${balance.amount.toLocaleString()}`
                        : balance.type === 'advance'
                          ? `Advance Rs ${balance.amount.toLocaleString()}`
                          : 'Clear'
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setForm({...form, customer_id: c.id})
                            setCustomerSearch(`${c.name} - ${c.phone || 'No phone'}`)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${Number(form.customer_id) === Number(c.id) ? 'bg-blue-50' : ''}`}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500"> - {c.phone || 'No phone'} - {balanceText}</span>
                        </button>
                      )
                    })
                  )}
                </div>
                {!!form.customer_id && <p className="mt-1 text-xs text-green-700">Customer selected</p>}
              </div>

              {/* Show current pending when customer selected */}
              {selectedSummary && (
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">Total Billed</span>
                    <span className="font-semibold">Rs {Number(selectedSummary.totals?.total_billed || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-semibold text-green-700">Rs {Number(selectedSummary.totals?.total_paid || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-sm flex justify-between mt-1">
                    <span className="text-gray-600">Balance</span>
                    {Number(selectedSummary.current_balance || 0) > 0 ? (
                      <span className="font-bold text-red-700">Rs {Number(selectedSummary.current_balance || 0).toLocaleString()} pending</span>
                    ) : Number(selectedSummary.current_balance || 0) < 0 ? (
                      <span className="font-bold text-green-700">Rs {Math.abs(Number(selectedSummary.current_balance || 0)).toLocaleString()} advance</span>
                    ) : (
                      <span className="font-bold">Clear</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})} className="input">
                  <option value="partial">Partial Payment</option>
                  <option value="full">Full Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input" rows={2} />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3">Record Payment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
