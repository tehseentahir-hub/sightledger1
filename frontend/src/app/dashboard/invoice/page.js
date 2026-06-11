'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Download, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../../../context/AuthContext'
import CenterAlert from '../../../components/CenterAlert'

import { API_URL, getRequestErrorMessage } from '../../../lib/api'
import { isHybridMode, isPetTradingMode } from '../../../lib/businessMode'

export default function InvoicePage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [petCustomers, setPetCustomers] = useState([])
  const [shopProfile, setShopProfile] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [invoiceBusiness, setInvoiceBusiness] = useState('water_19l')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [errorAlert, setErrorAlert] = useState('')
  const hasPetInvoices = isHybridMode(user) || isPetTradingMode(user)

  useEffect(() => {
    loadCustomers()
    loadShopProfile()
  }, [])

  useEffect(() => {
    if (!hasPetInvoices) return
    loadPetCustomers()
    if (isPetTradingMode(user)) setInvoiceBusiness('pet')
  }, [hasPetInvoices, user?.business_mode])

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`)
      setCustomers(res.data)
    } catch (err) { console.error(err) }
  }

  const loadShopProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      setShopProfile(res.data)
    } catch (err) {
      // Fallback to auth context if profile API call fails.
      setShopProfile(user || null)
    }
  }

  const loadPetCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/pet/customers`)
      setPetCustomers(res.data)
    } catch (err) { console.error(err) }
  }

  const generateInvoice = async () => {
    if (!selectedCustomer) return setErrorAlert('Please select a customer first.')
    if (invoiceBusiness === 'pet') {
      return generatePetInvoice()
    }

    setLoading(true)
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const res = await axios.get(`${API_URL}/deliveries`, {
        params: {
          customer_id: selectedCustomer,
          start_date: startDate,
          end_date: endDate
        }
      })
      const ledgerRes = await axios.get(`${API_URL}/payments/customer/${selectedCustomer}`)

      const customerDeliveries = res.data
      const ledger = ledgerRes.data
      const customer = customers.find(c => c.id === parseInt(selectedCustomer))

      if (!customerDeliveries.length) {
        setErrorAlert('No deliveries found for this selected month.')
        setLoading(false)
        return
      }

      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const shopName = (shopProfile?.shop_name || user?.shop_name || 'Water Shop').trim()

      // Header
      doc.setFontSize(20)
      doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.setTextColor(20, 20, 20)
      doc.text(shopName, pageWidth / 2, 30, { align: 'center' })

      // Invoice Details
      doc.setFontSize(11)
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 20, 45)
      doc.text(`Month: ${new Date(0, month - 1).toLocaleString('en', { month: 'long' })} ${year}`, 20, 52)

      // Customer Info
      doc.setFontSize(12)
      doc.text('Customer Details:', 20, 65)
      doc.setFontSize(11)
      doc.text(`Name: ${customer.name}`, 20, 73)
      doc.text(`Phone: ${customer.phone || 'N/A'}`, 20, 80)
      doc.text(`Address: ${customer.address || 'N/A'}`, 20, 87)
      doc.text(`Rate per Bottle: Rs ${customer.rate_per_bottle}`, 20, 94)
      doc.text(`Payment Type: ${customer.payment_type}`, 20, 101)

      // Deliveries Table
      const tableData = customerDeliveries.map(d => [
        d.delivery_date,
        d.bottles_delivered,
        d.bottles_returned,
        d.bottles_delivered - d.bottles_returned,
        d.delivery_type === 'home_delivery' ? 'Home' : 'Walk-in',
        d.rider_name || '-',
        `Rs ${(d.bottles_delivered * customer.rate_per_bottle).toLocaleString()}`
      ])

      autoTable(doc, {
        startY: 110,
        head: [['Date', 'Delivered', 'Returned', 'Net', 'Type', 'Rider', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] }
      })

      // Summary
      const finalY = doc.lastAutoTable.finalY + 10
      const totalBottles = customerDeliveries.reduce((sum, d) => sum + d.bottles_delivered, 0)
      const totalReturned = customerDeliveries.reduce((sum, d) => sum + d.bottles_returned, 0)
      const totalAmount = customerDeliveries.reduce((sum, d) => sum + (d.bottles_delivered * customer.rate_per_bottle), 0)
      const paidAmount = (ledger?.ledger || [])
        .filter(item => item.type === 'payment' && item.date >= startDate && item.date <= endDate)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const periodBalance = totalAmount - paidAmount
      const currentBalance = Number(ledger?.current_balance || 0)

      doc.setFontSize(12)
      doc.text(`Total Deliveries: ${customerDeliveries.length}`, 20, finalY)
      doc.text(`Total Bottles: ${totalBottles}`, 20, finalY + 8)
      doc.text(`Bottles Returned: ${totalReturned}`, 20, finalY + 16)
      doc.text(`Net Bottles: ${totalBottles - totalReturned}`, 20, finalY + 24)

      doc.setFontSize(14)
      doc.setTextColor(14, 165, 233)
      doc.text(`Total Amount: Rs ${totalAmount.toLocaleString()}`, 20, finalY + 36)
      doc.setTextColor(20, 20, 20)
      doc.setFontSize(12)
      doc.text(`Paid This Period: Rs ${paidAmount.toLocaleString()}`, 20, finalY + 46)
      doc.text(`Remaining This Period: Rs ${periodBalance.toLocaleString()}`, 20, finalY + 54)
      doc.text(
        currentBalance >= 0
          ? `Current Account Balance: Rs ${currentBalance.toLocaleString()} pending`
          : `Current Account Balance: Rs ${Math.abs(currentBalance).toLocaleString()} advance`,
        20,
        finalY + 62
      )

      // Footer on very bottom
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(9)
      doc.text('sightledger.com', pageWidth / 2, pageHeight - 16, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(90, 90, 90)
      doc.text('Powered by Sight Ledger', pageWidth / 2, pageHeight - 11, { align: 'center' })
      doc.setFontSize(8.5)
      doc.setTextColor(130, 130, 130)
      doc.text('Solution for water business operations and billing', pageWidth / 2, pageHeight - 6, { align: 'center' })

      // Save
      const monthName = new Date(0, month - 1).toLocaleString('en', { month: 'short' })
      doc.save(`invoice_${customer.name}_${monthName}_${year}.pdf`)

    } catch (err) {
      console.error(err)
      setErrorAlert(getRequestErrorMessage(err, 'Unable to generate invoice right now.'))
    }
    setLoading(false)
  }

  const generatePetInvoice = async () => {
    if (!selectedCustomer) return setErrorAlert('Please select a packaged bottle customer first.')

    setLoading(true)
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [salesRes, ledgerRes] = await Promise.all([
        axios.get(`${API_URL}/pet/transactions`, {
          params: { customer_id: selectedCustomer, txn_type: 'sale', start_date: startDate, end_date: endDate }
        }),
        axios.get(`${API_URL}/pet/customers/${selectedCustomer}/ledger`)
      ])

      const sales = salesRes.data || []
      const customer = petCustomers.find(c => Number(c.id) === Number(selectedCustomer)) || ledgerRes.data?.customer
      if (!sales.length) {
        setErrorAlert('No packaged bottle sales found for this selected month.')
        setLoading(false)
        return
      }

      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const shopName = (shopProfile?.shop_name || user?.shop_name || 'Water Shop').trim()
      const monthName = new Date(0, month - 1).toLocaleString('en', { month: 'long' })

      doc.setFontSize(20)
      doc.setTextColor(15, 23, 42)
      doc.text(shopName, pageWidth / 2, 20, { align: 'center' })
      doc.setFontSize(12)
      doc.setTextColor(71, 85, 105)
      doc.text('Packaged Bottle Monthly Statement', pageWidth / 2, 29, { align: 'center' })
      doc.text(`${monthName} ${year}`, pageWidth / 2, 36, { align: 'center' })

      doc.setFontSize(11)
      doc.setTextColor(20, 20, 20)
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 20, 50)
      doc.text(`Customer: ${customer?.name || 'Customer'}`, 20, 58)
      doc.text(`Phone: ${customer?.phone || 'N/A'}`, 20, 66)
      doc.text(`Type: ${customer?.customer_type || 'N/A'}`, 20, 74)

      const rows = sales.map((sale) => {
        const total = Number(sale.total_amount ?? (Number(sale.quantity || 0) * Number(sale.unit_price || 0)))
        return [
          sale.txn_date,
          sale.invoice_number || `PET-${sale.id}`,
          `${sale.item_name || '-'} ${sale.size_label || ''}`.trim(),
          Number(sale.quantity || 0).toLocaleString(),
          `Rs ${Number(sale.unit_price || 0).toLocaleString()}`,
          `Rs ${total.toLocaleString()}`,
          `Rs ${Number(sale.paid_amount || 0).toLocaleString()}`,
        ]
      })

      autoTable(doc, {
        startY: 86,
        head: [['Date', 'Invoice', 'Product', 'Qty', 'Unit Price', 'Total', 'Paid']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 9 },
      })

      const totalBilled = sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? (Number(sale.quantity || 0) * Number(sale.unit_price || 0))), 0)
      const paidInSales = sales.reduce((sum, sale) => sum + Number(sale.paid_amount || 0), 0)
      const periodPayments = (ledgerRes.data?.ledger || [])
        .filter(row => row.type === 'payment' && row.date >= startDate && row.date <= endDate)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      const paidThisPeriod = paidInSales + periodPayments
      const currentBalance = Number(ledgerRes.data?.current_balance || 0)
      const finalY = doc.lastAutoTable.finalY + 10

      doc.setFontSize(12)
      doc.setTextColor(20, 20, 20)
      doc.text(`Total Billed This Period: Rs ${totalBilled.toLocaleString()}`, 20, finalY)
      doc.text(`Paid This Period: Rs ${paidThisPeriod.toLocaleString()}`, 20, finalY + 8)
      doc.text(`Remaining This Period: Rs ${Math.max(0, totalBilled - paidThisPeriod).toLocaleString()}`, 20, finalY + 16)
      doc.text(
        currentBalance >= 0
          ? `Current Account Balance: Rs ${currentBalance.toLocaleString()} pending`
          : `Current Account Balance: Rs ${Math.abs(currentBalance).toLocaleString()} advance`,
        20,
        finalY + 24
      )

      doc.setTextColor(120, 120, 120)
      doc.setFontSize(9)
      doc.text('sightledger.com', pageWidth / 2, pageHeight - 16, { align: 'center' })
      doc.setFontSize(10)
      doc.text('Powered by Sight Ledger', pageWidth / 2, pageHeight - 11, { align: 'center' })
      doc.setFontSize(8.5)
      doc.text('Solution for water business operations and billing', pageWidth / 2, pageHeight - 6, { align: 'center' })

      doc.save(`packaged_invoice_${customer?.name || 'customer'}_${monthName}_${year}.pdf`)
    } catch (err) {
      console.error(err)
      setErrorAlert(getRequestErrorMessage(err, 'Unable to generate packaged bottle invoice right now.'))
    }
    setLoading(false)
  }

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]
  const activeCustomers = invoiceBusiness === 'pet' ? petCustomers : customers
  const selectedCustomerRecord = activeCustomers.find(c => Number(c.id) === Number(selectedCustomer))
  const customerQuery = customerSearch.trim().toLowerCase()
  const filteredCustomers = activeCustomers
    .filter(c => {
      if (!customerQuery) return true
      return (
        c.name?.toLowerCase().includes(customerQuery) ||
        String(c.phone || '').toLowerCase().includes(customerQuery) ||
        String(c.address || '').toLowerCase().includes(customerQuery)
      )
    })
    .slice(0, 12)

  const switchInvoiceBusiness = (business) => {
    setInvoiceBusiness(business)
    setSelectedCustomer('')
    setCustomerSearch('')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Generate Invoice</h1>

      <div className="card p-6 mb-6">
        {hasPetInvoices && !isPetTradingMode(user) && (
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => switchInvoiceBusiness('water_19l')}
              className={`rounded-xl border px-4 py-3 text-left font-semibold ${invoiceBusiness === 'water_19l' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}
            >
              19L Delivery Invoice
              <span className={`block text-xs font-normal ${invoiceBusiness === 'water_19l' ? 'text-white/80' : 'text-gray-500'}`}>Monthly delivery billing by customer</span>
            </button>
            <button
              type="button"
              onClick={() => switchInvoiceBusiness('pet')}
              className={`rounded-xl border px-4 py-3 text-left font-semibold ${invoiceBusiness === 'pet' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700'}`}
            >
              Packaged Bottle Invoice
              <span className={`block text-xs font-normal ${invoiceBusiness === 'pet' ? 'text-white/80' : 'text-gray-500'}`}>Product sales statement by customer</span>
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-2">Search Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value)
                  setSelectedCustomer('')
                }}
                className="input pl-10"
                placeholder="Type customer name, phone, or address..."
              />
            </div>
            <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-500">No customer found</p>
              ) : filteredCustomers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(String(c.id))
                    setCustomerSearch(`${c.name} - ${c.phone || 'No phone'}`)
                  }}
                  className={`w-full text-left px-3 py-3 text-sm hover:bg-blue-50 ${Number(selectedCustomer) === Number(c.id) ? 'bg-blue-50' : ''}`}
                >
                  <span className="font-medium">{c.name}</span>
                  {invoiceBusiness === 'pet' ? (
                    <span className="text-gray-500"> - {c.phone || 'No phone'} - {c.customer_type || 'Customer'} - Pending Rs {Number(c.outstanding_balance || 0).toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-500"> - {c.phone || 'No phone'} - {c.payment_type} - Rs {c.rate_per_bottle}/bottle</span>
                  )}
                </button>
              ))}
            </div>
            {selectedCustomerRecord && (
              <p className="mt-2 text-xs text-green-700">
                Selected: {selectedCustomerRecord.name} ({selectedCustomerRecord.phone || 'No phone'})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="input"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="input"
            >
              {Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 2 + index).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateInvoice}
          disabled={!selectedCustomer || loading}
          className="btn btn-primary mt-6 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Generating...
            </>
          ) : (
            <>
              <Download size={20} />
              Generate PDF Invoice
            </>
          )}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Instructions</h2>
        <ul className="text-gray-600 space-y-2 text-sm">
          <li>1. Search customer by name, phone, or address</li>
          <li>2. Choose the month and year for the invoice</li>
          <li>3. Choose 19L Delivery or Packaged Bottle invoice if this is a hybrid account</li>
          <li>4. Click "Generate PDF Invoice" button</li>
          <li>5. The invoice will be downloaded as a PDF file</li>
          <li>6. You can print or share the invoice</li>
        </ul>
      </div>
      <CenterAlert open={!!errorAlert} title="Invoice Error" message={errorAlert} onClose={() => setErrorAlert('')} />
    </div>
  )
}
