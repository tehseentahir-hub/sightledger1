import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const money = (value) => `Rs ${Number(value || 0).toLocaleString()}`
const cleanFilePart = (value) => String(value || 'invoice').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60)

export function downloadPetInvoicePdf(entry, options = {}) {
  const shopName = options.shopName || 'Water Shop'
  const invoiceNo = entry.invoice_number || `PET-${entry.id || Date.now()}`
  const quantity = Number(entry.quantity || 0)
  const unitPrice = Number(entry.unit_price || 0)
  const totalAmount = typeof entry.total_amount === 'number' ? entry.total_amount : quantity * unitPrice
  const paidAmount = typeof entry.paid_amount === 'number'
    ? entry.paid_amount
    : entry.payment_type === 'cash'
      ? totalAmount
      : 0
  const balance = Math.max(0, totalAmount - paidAmount)

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(shopName, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Packaged Bottle Sale Invoice', 14, 25)

  doc.setFontSize(16)
  doc.setTextColor(2, 132, 199)
  doc.text('INVOICE', pageWidth - 14, 18, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`Invoice No: ${invoiceNo}`, pageWidth - 14, 25, { align: 'right' })
  doc.text(`Date: ${entry.txn_date || '-'}`, pageWidth - 14, 31, { align: 'right' })

  doc.setDrawColor(226, 232, 240)
  doc.line(14, 38, pageWidth - 14, 38)

  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Bill To', 14, 48)
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(String(entry.customer_name || 'Customer'), 14, 55)
  if (entry.customer_phone) doc.text(String(entry.customer_phone), 14, 61)
  if (entry.customer_type) doc.text(String(entry.customer_type), 14, 67)

  autoTable(doc, {
    startY: 78,
    head: [['Product', 'Bottle Size', 'Quantity', 'Unit Price', 'Total']],
    body: [[
      entry.item_name || '-',
      entry.size_label || '-',
      quantity.toLocaleString(),
      money(unitPrice),
      money(totalAmount),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 4 },
  })

  const summaryY = doc.lastAutoTable.finalY + 12
  const labelX = pageWidth - 76
  const valueX = pageWidth - 14
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Total Amount', labelX, summaryY)
  doc.text(money(totalAmount), valueX, summaryY, { align: 'right' })
  doc.text('Paid Amount', labelX, summaryY + 8)
  doc.text(money(paidAmount), valueX, summaryY + 8, { align: 'right' })
  doc.setTextColor(balance > 0 ? 220 : 22, balance > 0 ? 38 : 163, balance > 0 ? 38 : 74)
  doc.text('Balance', labelX, summaryY + 16)
  doc.text(money(balance), valueX, summaryY + 16, { align: 'right' })

  doc.setDrawColor(226, 232, 240)
  doc.line(14, pageHeight - 24, pageWidth - 14, pageHeight - 24)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('sightledger.com', pageWidth / 2, pageHeight - 17, { align: 'center' })
  doc.text('Powered by Sight Ledger - Solution for water business operations and billing', pageWidth / 2, pageHeight - 11, { align: 'center' })

  doc.save(`${cleanFilePart(invoiceNo)}_${cleanFilePart(entry.customer_name)}.pdf`)
}
