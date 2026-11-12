import { useEffect, useState, useMemo } from 'react'
import { ArrowDownToLine, ArrowUpRight, Bell, CalendarDays, ChevronLeft, ChevronRight, Copy, Ellipsis, Eye, FileText, Filter, Pencil, Plus, Repeat2, Search, Settings2, Trash2, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import '../../css/dashboard.css'

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const INVOICES_PER_PAGE = 8

export default function Billing() {
  const { user } = useAuth()
  const location = useLocation()
  const invoiceId = location.state?.invoiceId || ''
  const [business, setBusiness] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('latest')
  const [actionMenuOpen, setActionMenuOpen] = useState(null)
  const [actionMenuPosition, setActionMenuPosition] = useState(null)

  useEffect(() => {
    if (!actionMenuOpen) return undefined
    function closeMenu(event) {
      if (!event.target.closest('.billing-actions-cell, .billing-action-menu')) {
        setActionMenuOpen(null)
        setActionMenuPosition(null)
      }
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [actionMenuOpen])

  useEffect(() => {
    let active = true
    async function load() {
      const { data: businesses, error: businessError } = await supabase.from('businesses').select('id').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1)
      if (businessError || !businesses?.[0]) {
        if (active) { setError(businessError?.message || 'Create your business from the dashboard first.'); setLoading(false) }
        return
      }
      const current = businesses[0]
      const ordersResult = await supabase.from('sales_orders').select('id, customer_id, total, subtotal, paid_amount, payment_status, sold_at, invoice_number, invoice_date, due_date, payment_terms, discount_amount, invoice_notes, invoice_terms, customers(name, email, phone)').eq('business_id', current.id).order('sold_at', { ascending: false }).limit(50)
      const orderIds = (ordersResult.data || []).map((order) => order.id)
      const itemsResult = orderIds.length
        ? await supabase.from('sales_order_items').select('order_id, quantity, unit_price, inventory_products(name, sku)').in('order_id', orderIds)
        : { data: [], error: null }
      if (active) {
        setBusiness(current)
        setOrders(ordersResult.data || [])
        setOrderItems(itemsResult.data || [])
        if (invoiceId) {
          setSelectedInvoice((current) => current || (ordersResult.data || []).find((order) => order.id === invoiceId) || null)
        }
        setError(ordersResult.error?.message || itemsResult.error?.message || '')
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user.id, invoiceId])

  const totalBilled = orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const paidOrders = orders.filter((order) => order.payment_status === 'paid').length
  const pendingOrders = orders.filter((order) => order.payment_status === 'partial').length
  const unpaidOrders = orders.filter((order) => order.payment_status === 'unpaid').length
  const overdueOrders = orders.filter((order) => order.payment_status === 'overdue').length

  const monthlyRevenue = useMemo(() => {
    const months = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = date.toISOString().slice(0, 7)
      months[key] = { month: date.toLocaleDateString('en-US', { month: 'short' }), revenue: 0 }
    }
    orders.forEach((order) => {
      const orderDate = new Date(order.sold_at)
      const key = orderDate.toISOString().slice(0, 7)
      if (months[key]) {
        months[key].revenue += Number(order.total || 0)
      }
    })
    return Object.values(months)
  }, [orders])

  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1)
  const previousPeriodRevenue = monthlyRevenue.slice(0, 3).reduce((sum, m) => sum + m.revenue, 0)
  const currentPeriodRevenue = monthlyRevenue.slice(3).reduce((sum, m) => sum + m.revenue, 0)
  const revenueChange = previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchingOrders = orders.filter((order) => {
      const matchesQuery = !normalized || [order.invoice_number, order.customers?.name, order.customers?.email, order.customers?.phone].some((value) => String(value || '').toLowerCase().includes(normalized))
      const matchesStatus = !statusFilter || order.payment_status === statusFilter
      return matchesQuery && matchesStatus
    })
    return [...matchingOrders].sort((a, b) => {
      if (sortOrder === 'amount') return Number(b.total || 0) - Number(a.total || 0)
      const first = new Date(a.sold_at || 0).getTime()
      const second = new Date(b.sold_at || 0).getTime()
      return sortOrder === 'oldest' ? first - second : second - first
    })
  }, [query, orders, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / INVOICES_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice((activePage - 1) * INVOICES_PER_PAGE, activePage * INVOICES_PER_PAGE)

  function getInvoiceItems(orderId) {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  function downloadStoredInvoice(invoice) {
    const pdf = new jsPDF()
    pdf.setFontSize(22); pdf.setFont(undefined, 'bold'); pdf.text(business.name || 'OPULIT', 20, 25)
    pdf.setFontSize(18); pdf.text('INVOICE', 145, 25)
    pdf.setFontSize(10); pdf.setFont(undefined, 'normal'); pdf.text(`#${invoice.invoice_number}`, 145, 32)
    pdf.text(`Invoice date: ${invoice.invoice_date || new Date(invoice.sold_at).toLocaleDateString()}`, 20, 48)
    pdf.text(`Due date: ${invoice.due_date || '—'}`, 20, 55)
    pdf.text(`Bill to: ${invoice.customers?.name || 'Walk-in customer'}`, 20, 70)
    let y = 90
    getInvoiceItems(invoice.id).forEach((item) => {
      pdf.text(`${item.inventory_products?.name || 'Product'} x ${item.quantity}`, 20, y)
      pdf.text(`Rs. ${(Number(item.unit_price) * Number(item.quantity)).toLocaleString('en-IN')}`, 150, y)
      y += 10
    })
    pdf.setFont(undefined, 'bold'); pdf.text(`Total: Rs. ${Number(invoice.total).toLocaleString('en-IN')}`, 130, y + 12)
    pdf.save(`invoice-${invoice.invoice_number || invoice.id.slice(0, 6)}.pdf`)
  }

  function toggleActionMenu(event, orderId) {
    event.stopPropagation()
    if (actionMenuOpen === orderId) {
      setActionMenuOpen(null)
      setActionMenuPosition(null)
      return
    }
    const buttonBounds = event.currentTarget.getBoundingClientRect()
    const menuHeight = 130
    const openAbove = buttonBounds.bottom + menuHeight > window.innerHeight
    setActionMenuOpen(orderId)
    setActionMenuPosition({
      left: Math.max(8, buttonBounds.right - 140),
      top: openAbove ? buttonBounds.top - menuHeight - 4 : buttonBounds.bottom + 4,
    })
  }

  async function deleteInvoice(orderId) {
    setError('')
    const { error: deleteError } = await supabase.from('sales_orders').delete().eq('id', orderId)
    if (deleteError) setError(deleteError.message)
    else {
      setOrders((current) => current.filter((order) => order.id !== orderId))
      setActionMenuOpen(null)
      setActionMenuPosition(null)
    }
  }

  return <main className="dashboard-page"><div className="dashboard-workspace"><DashboardSidebar /><section className="dashboard-main"><DashboardHeader /><div className="management-content billing-content billing-reference-layout">
    <div className="billing-reference-heading"><div className="billing-reference-title"><span className="billing-reference-icon"><FileText size={25} /></span><div><h1>Billing</h1><p>Create invoices, track payments and manage your sales.</p></div></div><div className="billing-reference-heading-actions"><button type="button" className="billing-reference-secondary"><ArrowDownToLine size={15} /> Import</button><button type="button" className="billing-reference-primary"><Plus size={16} /> Create Invoice</button></div></div>
    <div className="billing-top-row"><section className="billing-reference-hero"><div><span className="billing-hero-eyebrow">GET PAID FASTER</span><h2>Create and send invoices<br />in seconds.</h2><p>Generate professional invoices and share them<br />via WhatsApp, email or download as PDF.</p><button type="button" className="billing-reference-primary">Create Invoice <ArrowUpRight size={16} /></button></div></section><section className="billing-reference-card billing-quick-actions"><h3>Quick Actions</h3><div><button type="button"><FileText /><strong>Create Invoice</strong><small>Generate a new invoice</small></button><button type="button"><Repeat2 /><strong>Recurring Invoices</strong><small>Set up auto invoices</small></button><button type="button"><Copy /><strong>Invoice Templates</strong><small>Customize your invoices</small></button><button type="button"><Settings2 /><strong>Payment Settings</strong><small>Configure methods</small></button></div></section></div>
    <div className="billing-reference-columns"><div className="billing-reference-main">
      {error && <p className="auth-error management-error" role="alert">{error}</p>}
      <section className="management-table-wrap billing-invoices"><div className="billing-invoices-heading"><div><h2>All invoices ({filteredOrders.length})</h2><p>Review completed and pending payments.</p></div></div><div className="billing-filter-row"><label className="billing-list-search"><Search size={16} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search invoices..." aria-label="Search invoices" /></label><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }} aria-label="Filter by status"><option value="">All Bills</option><option value="paid">Paid</option><option value="partial">Pending</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option></select><select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setCurrentPage(1) }} aria-label="Sort invoices"><option value="latest">Latest</option><option value="oldest">Oldest</option><option value="amount">Highest Amount</option></select></div><table className="management-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Loading...</td></tr> : orders.length === 0 ? <tr><td className="management-empty" colSpan="6">No sales recorded yet.</td></tr> : paginatedOrders.map((order) => <tr key={order.id}><td><strong>{order.invoice_number || `INV-${order.id.slice(0, 4).toUpperCase()}`}</strong></td><td><span className="billing-customer-cell"><span className="billing-customer-avatar">{(order.customers?.name || 'W').charAt(0)}</span><span>{order.customers?.name || 'Walk-in customer'}<small>{getInvoiceItems(order.id).length} items</small></span></span></td><td>{new Date(order.invoice_date || order.sold_at).toLocaleDateString()}</td><td><strong>{formatCurrency(order.total)}</strong></td><td><span className={`billing-payment-status ${order.payment_status}`}>{order.payment_status}</span></td><td className="billing-actions-cell"><button type="button" className="billing-more-button" onClick={(event) => toggleActionMenu(event, order.id)} aria-label="View invoice actions"><Ellipsis size={17} /></button></td></tr>)}</tbody></table><div className="billing-table-footer"><span>Showing {orders.length === 0 ? 0 : (activePage - 1) * INVOICES_PER_PAGE + 1}–{Math.min(activePage * INVOICES_PER_PAGE, orders.length)} of {orders.length} invoices</span><div className="inventory-pagination"><button type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={activePage === 1} aria-label="Previous page"><ChevronLeft size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button type="button" className={activePage === page ? 'is-active' : ''} onClick={() => setCurrentPage(page)} key={page}>{page}</button>)}<button type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={activePage === totalPages} aria-label="Next page"><ChevronRight size={16} /></button></div></div></section>
    </div><aside className="billing-reference-aside"><section className="billing-reference-card billing-revenue-card"><div className="billing-aside-card-heading"><h3>Revenue Overview</h3><button type="button">Last 6 Months⌄</button></div><strong>{formatCurrency(totalBilled)}</strong><span className="billing-revenue-change">{revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(0)}% from last 6 months</span><div className="billing-bar-chart">{monthlyRevenue.map((month, index) => <span key={index} style={{ height: `${Math.max(14, (month.revenue / maxMonthlyRevenue) * 62)}px` }}><i>{month.month}</i></span>)}</div></section><section className="billing-reference-card billing-payment-card"><h3>Payment Status</h3><div className="billing-donut" style={{ '--paid': `${orders.length ? (paidOrders / orders.length) * 100 : 0}%`, '--pending': `${orders.length ? ((paidOrders + pendingOrders) / orders.length) * 100 : 0}%` }}><strong>{orders.length}<small>Invoices</small></strong></div><ul><li><b className="paid-dot" />Paid <span>{paidOrders}</span></li><li><b className="pending-dot" />Pending <span>{pendingOrders}</span></li><li><b className="unpaid-dot" />Unpaid <span>{unpaidOrders}</span></li><li><b className="overdue-dot" />Overdue <span>{overdueOrders}</span></li></ul></section><section className="billing-reference-card billing-activity-card"><div className="billing-aside-card-heading"><h3>Recent Activity</h3><button type="button">View all <ArrowUpRight size={13} /></button></div>{orders.slice(0, 3).map((order) => <div className="billing-activity-row" key={order.id}><span><Bell size={14} /></span><p><strong>{order.payment_status === 'paid' ? 'Payment received' : 'Invoice created'}</strong><small>{order.invoice_number || 'Invoice'} · {formatCurrency(order.total)}</small></p><time>Recently</time></div>)}</section></aside></div>
    </div></section>{actionMenuOpen && actionMenuPosition && (() => {
                const order = orders.find((order) => order.id === actionMenuOpen)
                if (!order) return null
                return <div className="billing-action-menu billing-action-menu-fixed" style={actionMenuPosition} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setSelectedInvoice(order); setActionMenuOpen(null); setActionMenuPosition(null) }}>View Invoice</button><button type="button" onClick={() => { downloadStoredInvoice(order); setActionMenuOpen(null); setActionMenuPosition(null) }}>Download PDF</button><button type="button" className="is-danger" onClick={() => { deleteInvoice(order.id) }}>Delete Invoice</button></div>
              })()}</div>{selectedInvoice && <StoredInvoiceModal invoice={selectedInvoice} items={getInvoiceItems(selectedInvoice.id)} onClose={() => setSelectedInvoice(null)} onDownload={() => downloadStoredInvoice(selectedInvoice)} business={business} />}</main>
}

function StoredInvoiceModal({ invoice, items, onClose, onDownload, business }) {
  return <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="dashboard-activity-modal stored-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="stored-invoice-title">
      <header className="invoice-preview-topbar"><div><h2 id="stored-invoice-title">Invoice {invoice.invoice_number || `#${invoice.id.slice(0, 6).toUpperCase()}`}</h2><p>Saved invoice</p></div><button type="button" className="dashboard-activity-modal-close" onClick={onClose} aria-label="Close invoice"><X size={17} /></button></header>
      <div className="dashboard-activity-modal-body invoice-preview-body"><article className="invoice-paper"><div className="invoice-paper-brand"><div><h2>{business?.name || 'OPULIT'}</h2><strong>{business?.business_type || 'Business'}</strong></div><div className="invoice-paper-number"><strong>INVOICE</strong><span>#{invoice.invoice_number || invoice.id.slice(0, 6).toUpperCase()}</span></div></div><div className="invoice-bill-to"><span>Bill To</span><strong>{invoice.customers?.name || 'Walk-in customer'}</strong><small>{invoice.customers?.email || invoice.customers?.phone || 'No contact details'}</small></div><div className="invoice-preview-table"><div className="invoice-preview-table-head"><span>#</span><span>Product</span><span>Qty</span><span>Price</span><span>Total</span></div>{items.map((item, index) => <div className="invoice-preview-table-row" key={item.order_id + item.inventory_products?.name}><span>{index + 1}</span><span><strong>{item.inventory_products?.name || 'Product'}</strong><small>SKU: {item.inventory_products?.sku || 'Not set'}</small></span><span>{item.quantity}</span><span>{formatCurrency(item.unit_price)}</span><span>{formatCurrency(Number(item.unit_price) * Number(item.quantity))}</span></div>)}</div><div className="invoice-paper-totals"><b>Total <strong>{formatCurrency(invoice.total)}</strong></b></div><div className="invoice-paper-note"><span>Notes</span><p>{invoice.invoice_notes || '—'}</p></div><div className="invoice-paper-note"><span>Terms & Conditions</span><p>{invoice.invoice_terms || '—'}</p></div></article></div><footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Close</button><button type="button" className="inventory-modal-submit" onClick={onDownload}>Download invoice</button></footer>
    </section>
  </div>
}
