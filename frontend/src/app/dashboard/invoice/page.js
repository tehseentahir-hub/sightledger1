'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../../../context/AuthContext'

import { API_URL } from '../../../lib/api'

export default function InvoicePage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [shopProfile, setShopProfile] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCustomers()
    loadShopProfile()
  }, [])

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

  const generateInvoice = async () => {
    if (!selectedCustomer) return alert('Select a customer first')

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
        alert('No deliveries found for this month')
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
      alert('Error generating invoice')
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Generate Invoice</h1>

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Customer</label>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="input"
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.payment_type})
                </option>
              ))}
            </select>
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
          <li>1. Select a customer from the dropdown</li>
          <li>2. Choose the month and year for the invoice</li>
          <li>3. Click "Generate PDF Invoice" button</li>
          <li>4. The invoice will be downloaded as a PDF file</li>
          <li>5. You can print or share the invoice</li>
        </ul>
      </div>
    </div>
  )
}
