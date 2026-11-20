import { useEffect, useState, useMemo } from 'react'

import { ArrowDownToLine, ArrowUpRight, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Copy, Ellipsis, Eye, FileText, Filter, IndianRupee, LayoutDashboard, Package, Pencil, Plus, Repeat2, Search, Settings2, Sparkles, Trash2, UserRound, X } from 'lucide-react'

import { jsPDF } from 'jspdf'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/useAuth'

import { supabase } from '../lib/supabase'

import DashboardSidebar from './DashboardSidebar'

import DashboardHeader from './DashboardHeader'

import DashboardFooter from './DashboardFooter'


import '../../css/dashboard.css'



const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const INVOICES_PER_PAGE = 10

function BillingSparkline({ data, dataKey, color, gradientId }) {
  return <div className="billing-mini-spark"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 3, right: 0, bottom: 1, left: 0 }}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs><Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3, fill: color, stroke: '#fff', strokeWidth: 1.5 }} /></AreaChart></ResponsiveContainer></div>
}



export default function Billing() {

  const { user } = useAuth()

  const location = useLocation()

  const navigate = useNavigate()

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

  const [showInvoiceModal, setShowInvoiceModal] = useState(false)



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

  const pendingInvoiceCount = pendingOrders + unpaidOrders + overdueOrders



  const monthlyRevenue = useMemo(() => {

    const months = {}

    const now = new Date()

    for (let i = 5; i >= 0; i--) {

      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)

      const key = date.toISOString().slice(0, 7)

      months[key] = { month: date.toLocaleDateString('en-US', { month: 'short' }), revenue: 0, invoices: 0, paid: 0, pending: 0 }

    }

    orders.forEach((order) => {

      const orderDate = new Date(order.sold_at)

      const key = orderDate.toISOString().slice(0, 7)

      if (months[key]) {

        months[key].revenue += Number(order.total || 0)
        months[key].invoices += 1
        if (order.payment_status === 'paid') months[key].paid += 1
        else months[key].pending += 1

      }

    })

    return Object.values(months)

  }, [orders])



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

  function renderRevenueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null

    return <div className="dashboard-chart-tooltip billing-chart-tooltip"><strong>{label}</strong><span><em>Revenue</em><b>{formatCurrency(payload[0].value)}</b></span></div>
  }



  return <main className="dashboard-page"><div className="dashboard-workspace"><DashboardSidebar /><section className="dashboard-main"><DashboardHeader /><div className="dashboard-content dashboard-content-hero">

    <div className="billing-reference-heading"><div className="billing-reference-title"><div><h1>Billing</h1><p>Create invoices, track payments and manage your sales.</p></div></div><div className="billing-reference-heading-actions"><button type="button" className="billing-reference-primary" onClick={() => setShowInvoiceModal(true)}><Plus size={16} /> Create Invoice</button></div></div>

    <div className="billing-summary-grid"><section className="billing-summary-card"><span className="billing-summary-icon is-mint"><FileText size={19} /></span><div><p>Total invoices</p><strong>{orders.length}</strong><small className="is-positive">All recorded invoices</small></div><BillingSparkline data={monthlyRevenue} dataKey="invoices" color="#62dca2" gradientId="billing-invoices-spark-fill" /></section><section className="billing-summary-card"><span className="billing-summary-icon is-dark"><IndianRupee size={19} /></span><div><p>Total revenue</p><strong>{formatCurrency(totalBilled)}</strong><small className="is-positive">{revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(0)}% <em>vs previous period</em></small></div><BillingSparkline data={monthlyRevenue} dataKey="revenue" color="#45d994" gradientId="billing-revenue-spark-fill" /></section><section className="billing-summary-card"><span className="billing-summary-icon is-green"><CheckCircle2 size={20} /></span><div><p>Paid invoices</p><strong>{paidOrders}</strong><small className="is-positive">{orders.length ? Math.round((paidOrders / orders.length) * 100) : 0}% <em>of all invoices</em></small></div><BillingSparkline data={monthlyRevenue} dataKey="paid" color="#45d994" gradientId="billing-paid-spark-fill" /></section><section className="billing-summary-card"><span className="billing-summary-icon is-amber"><CalendarDays size={19} /></span><div><p>Pending invoices</p><strong>{pendingInvoiceCount}</strong><small className={pendingInvoiceCount ? 'is-pending' : 'is-positive'}>{pendingInvoiceCount ? 'Needs follow-up' : 'All caught up'}</small></div><BillingSparkline data={monthlyRevenue} dataKey="pending" color="#f59e0b" gradientId="billing-pending-spark-fill" /></section></div>

    <div className="billing-reference-columns"><div className="billing-reference-main">

      {error && <p className="auth-error management-error" role="alert">{error}</p>}

      <section className="management-table-wrap billing-invoices"><div className="billing-filter-row"><div className="billing-filter-heading"><h2>All Invoices ({filteredOrders.length})</h2><p>Track and manage all your invoices.</p></div><div className="billing-filter-controls"><label className="billing-list-search"><Search size={16} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search invoices..." aria-label="Search invoices" /></label><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }} aria-label="Filter by status"><option value="">All Bills</option><option value="paid">Paid</option><option value="partial">Pending</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option></select><select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setCurrentPage(1) }} aria-label="Sort invoices"><option value="latest">Latest</option><option value="oldest">Oldest</option><option value="amount">Highest Amount</option></select></div></div><table className="management-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Loading...</td></tr> : orders.length === 0 ? <tr><td className="management-empty" colSpan="6">No sales recorded yet.</td></tr> : paginatedOrders.map((order) => <tr key={order.id}><td><strong>{order.invoice_number || `INV-${order.id.slice(0, 4).toUpperCase()}`}</strong></td><td><span className="billing-customer-cell"><span className="billing-customer-avatar">{(order.customers?.name || 'W').charAt(0)}</span><span>{order.customers?.name || 'Walk-in customer'}<small>{getInvoiceItems(order.id).length} items</small></span></span></td><td>{new Date(order.invoice_date || order.sold_at).toLocaleDateString()}</td><td><strong>{formatCurrency(order.total)}</strong></td><td><span className={`billing-payment-status ${order.payment_status}`}>{order.payment_status}</span></td><td className="billing-actions-cell"><button type="button" className="billing-more-button" onClick={(event) => toggleActionMenu(event, order.id)} aria-label="View invoice actions"><Ellipsis size={17} /></button></td></tr>)}</tbody></table><div className="billing-table-footer"><span>Showing {orders.length === 0 ? 0 : (activePage - 1) * INVOICES_PER_PAGE + 1}–{Math.min(activePage * INVOICES_PER_PAGE, orders.length)} of {orders.length} invoices</span><div className="inventory-pagination"><button type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={activePage === 1} aria-label="Previous page"><ChevronLeft size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button type="button" className={activePage === page ? 'is-active' : ''} onClick={() => setCurrentPage(page)} key={page}>{page}</button>)}<button type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={activePage === totalPages} aria-label="Next page"><ChevronRight size={16} /></button></div></div></section>

    </div><aside className="billing-reference-aside"><section className="billing-reference-card billing-revenue-card"><div className="billing-aside-card-heading"><h3>Revenue overview</h3><span>6 months⌄</span></div><strong>{formatCurrency(totalBilled)}</strong><span className="billing-revenue-change">{revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(0)}% vs previous 6 months</span><div className="billing-recharts-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRevenue} margin={{ top: 10, right: 4, bottom: 0, left: -20 }}><defs><linearGradient id="billing-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10a466" stopOpacity={0.2} /><stop offset="100%" stopColor="#10a466" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#f0eeeb" /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#858b86', fontSize: 9 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#858b86', fontSize: 9 }} tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${Math.round(value)}`} width={38} /><Tooltip content={renderRevenueTooltip} cursor={{ stroke: '#c9c6c2', strokeDasharray: '3 3' }} /><Area type="monotone" dataKey="revenue" stroke="#10a466" strokeWidth={2.5} fill="url(#billing-revenue-fill)" dot={false} activeDot={{ r: 5, fill: '#10a466', stroke: '#fff', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div></section><section className="billing-reference-card billing-payment-card"><h3>Payment status</h3><div className="billing-donut" style={{ '--paid': `${orders.length ? (paidOrders / orders.length) * 100 : 0}%`, '--pending': `${orders.length ? ((paidOrders + pendingOrders) / orders.length) * 100 : 0}%` }}><strong>{orders.length}<small>Invoices</small></strong></div><ul><li><b className="paid-dot" />Paid <span>{paidOrders}</span></li><li><b className="pending-dot" />Pending <span>{pendingOrders}</span></li><li><b className="unpaid-dot" />Unpaid <span>{unpaidOrders}</span></li><li><b className="overdue-dot" />Overdue <span>{overdueOrders}</span></li></ul></section><section className="billing-reference-card billing-growth-card"><span className="billing-growth-icon" aria-hidden="true"><Sparkles size={19} strokeWidth={2} /></span><div className="billing-growth-copy"><strong>Keep growing!</strong><p>Unlock more features for your business.</p><button type="button" onClick={() => navigate('/pricing')}>Explore pricing <ArrowUpRight size={14} /></button></div></section></aside></div>

    </div><DashboardFooter /></section>{actionMenuOpen && actionMenuPosition && (() => {

                const order = orders.find((order) => order.id === actionMenuOpen)

                if (!order) return null

                return <div className="billing-action-menu billing-action-menu-fixed" style={actionMenuPosition} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setSelectedInvoice(order); setActionMenuOpen(null); setActionMenuPosition(null) }}>View Invoice</button><button type="button" onClick={() => { downloadStoredInvoice(order); setActionMenuOpen(null); setActionMenuPosition(null) }}>Download PDF</button><button type="button" className="is-danger" onClick={() => { deleteInvoice(order.id) }}>Delete Invoice</button></div>

              })()}</div>{selectedInvoice && <StoredInvoiceModal invoice={selectedInvoice} items={getInvoiceItems(selectedInvoice.id)} onClose={() => setSelectedInvoice(null)} onDownload={() => downloadStoredInvoice(selectedInvoice)} business={business} />}{showInvoiceModal && business && <InvoiceModal business={business} onClose={() => setShowInvoiceModal(false)} />}</main>

}



function StoredInvoiceModal({ invoice, items, onClose, onDownload, business }) {

  return <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>

    <section className="dashboard-activity-modal stored-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="stored-invoice-title">

      <header className="invoice-preview-topbar"><div><h2 id="stored-invoice-title">Invoice {invoice.invoice_number || `#${invoice.id.slice(0, 6).toUpperCase()}`}</h2><p>Saved invoice</p></div><button type="button" className="dashboard-activity-modal-close" onClick={onClose} aria-label="Close invoice"><X size={17} /></button></header>

      <div className="dashboard-activity-modal-body invoice-preview-body"><article className="invoice-paper"><div className="invoice-paper-brand"><div><h2>{business?.name || 'OPULIT'}</h2><strong>{business?.business_type || 'Business'}</strong></div><div className="invoice-paper-number"><strong>INVOICE</strong><span>#{invoice.invoice_number || invoice.id.slice(0, 6).toUpperCase()}</span></div></div><div className="invoice-bill-to"><span>Bill To</span><strong>{invoice.customers?.name || 'Walk-in customer'}</strong><small>{invoice.customers?.email || invoice.customers?.phone || 'No contact details'}</small></div><div className="invoice-preview-table"><div className="invoice-preview-table-head"><span>#</span><span>Product</span><span>Qty</span><span>Price</span><span>Total</span></div>{items.map((item, index) => <div className="invoice-preview-table-row" key={item.order_id + item.inventory_products?.name}><span>{index + 1}</span><span><strong>{item.inventory_products?.name || 'Product'}</strong><small>SKU: {item.inventory_products?.sku || 'Not set'}</small></span><span>{item.quantity}</span><span>{formatCurrency(item.unit_price)}</span><span>{formatCurrency(Number(item.unit_price) * Number(item.quantity))}</span></div>)}</div><div className="invoice-paper-totals"><b>Total <strong>{formatCurrency(invoice.total)}</strong></b></div><div className="invoice-paper-note"><span>Notes</span><p>{invoice.invoice_notes || '—'}</p></div><div className="invoice-paper-note"><span>Terms & Conditions</span><p>{invoice.invoice_terms || '—'}</p></div></article></div><footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Close</button><button type="button" className="inventory-modal-submit" onClick={onDownload}>Download invoice</button></footer>

    </section>

  </div>

}



function InvoiceModal({ business, onClose }) {
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [customerId, setCustomerId] = useState('')
  const paymentStatus = 'paid'
  const paidAmount = ''
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`)
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [paymentTerms, setPaymentTerms] = useState('Net 7 Days')
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('Thank you for your business!')
  const [terms, setTerms] = useState('1. Payment is due within 7 days.\n2. Goods once sold cannot be returned.')
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })
  const [customerSaving, setCustomerSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function loadOptions() {
      const [productsResult, customersResult] = await Promise.all([
        supabase.from('inventory_products').select('id, name, sku, image_url, quantity, selling_price, cost_price').eq('business_id', business.id).order('name'),
        supabase.from('customers').select('id, name, phone, email').eq('business_id', business.id).order('name'),
      ])
      if (!active) return
      setProducts(productsResult.data || [])
      setCustomers(customersResult.data || [])
      setError(productsResult.error?.message || customersResult.error?.message || '')
      setLoading(false)
    }
    loadOptions()
    return () => { active = false }
  }, [business.id])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const selectedProduct = products.find((product) => product.id === productId)
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const saleQuantity = Number(quantity) || 0
  const subtotal = (Number(selectedProduct?.selling_price) || 0) * saleQuantity
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discount) || 0))
  const total = subtotal - discountAmount

  async function addCustomer() {
    if (!newCustomer.name.trim()) return
    setCustomerSaving(true)
    setError('')
    const { data: customer, error: customerError } = await supabase.from('customers').insert({
      business_id: business.id,
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim() || null,
      email: newCustomer.email.trim() || null,
    }).select('id, name, phone, email').single()
    if (customerError) {
      setError(customerError.message)
      setCustomerSaving(false)
      return
    }
    setCustomers((current) => [...current, customer].sort((first, second) => first.name.localeCompare(second.name)))
    setCustomerId(customer.id)
    setNewCustomer({ name: '', phone: '', email: '' })
    setShowCustomerForm(false)
    setCustomerSaving(false)
  }

  async function createInvoice(event) {
    event.preventDefault()
    if (!selectedProduct || saleQuantity < 1 || saleQuantity > selectedProduct.quantity) {
      setError('Select a product and a valid quantity in stock.')
      return
    }
    setSaving(true)
    setError('')
    const { data: order, error: orderError } = await supabase.rpc('record_sale', {
      p_business_id: business.id,
      p_product_id: selectedProduct.id,
      p_quantity: saleQuantity,
      p_customer_id: customerId || null,
      p_payment_status: paymentStatus,
      p_paid_amount: paymentStatus === 'paid' ? total : paymentStatus === 'unpaid' ? 0 : Number(paidAmount) || 0,
    })
    if (orderError) {
      setError(orderError.message)
      setSaving(false)
      return
    }
    let savedOrder = order
    if (discountAmount > 0) {
      const { data: updatedOrder, error: discountError } = await supabase.from('sales_orders').update({
        subtotal,
        total,
        paid_amount: paymentStatus === 'paid' ? total : Number(paidAmount) || 0,
      }).eq('id', order.id).select().single()
      if (discountError) {
        setError(discountError.message)
        setSaving(false)
        return
      }
      savedOrder = updatedOrder
    }
    const { data: storedInvoice, error: invoiceError } = await supabase.from('sales_orders').update({
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      payment_terms: paymentTerms,
      discount_amount: discountAmount,
      invoice_notes: notes,
      invoice_terms: terms,
    }).eq('id', savedOrder.id).select().single()
    if (invoiceError) {
      setError(invoiceError.message)
      setSaving(false)
      return
    }
    setInvoice({ order: storedInvoice, product: selectedProduct, quantity: saleQuantity, customer: selectedCustomer, invoiceNumber, invoiceDate, dueDate, paymentTerms, discountAmount, notes, terms })
    setSaving(false)
  }

  function createInvoicePdf() {
    const pdf = new jsPDF()
    const invoiceNumber = invoice.invoiceNumber
    const lineY = (y) => pdf.setDrawColor(225, 222, 218).line(20, y, 190, y)
    pdf.setTextColor(23, 24, 25)
    pdf.setFontSize(22)
    pdf.setFont(undefined, 'bold')
    pdf.text(business.name || 'OPULIT', 20, 25)
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(95, 90, 85)
    pdf.text(business.business_type || 'Business invoice', 20, 32)
    pdf.setTextColor(23, 24, 25)
    pdf.setFontSize(18)
    pdf.setFont(undefined, 'bold')
    pdf.text('INVOICE', 145, 25)
    pdf.setFontSize(10)
    pdf.setFont(undefined, 'normal')
    pdf.text(`#${invoiceNumber}`, 145, 32)
    lineY(40)
    pdf.setTextColor(95, 90, 85)
    pdf.setFontSize(9)
    pdf.text(`Invoice date: ${invoice.invoiceDate}`, 20, 50)
    pdf.text(`Due date: ${invoice.dueDate}`, 20, 57)
    pdf.text(`Payment terms: ${invoice.paymentTerms}`, 20, 64)
    pdf.setTextColor(23, 24, 25)
    pdf.setFont(undefined, 'bold')
    pdf.text('Bill To', 20, 78)
    pdf.setFont(undefined, 'normal')
    pdf.text(invoice.customer?.name || 'Walk-in customer', 20, 86)
    pdf.setTextColor(95, 90, 85)
    pdf.text(invoice.customer?.email || invoice.customer?.phone || 'No contact details', 20, 93)
    lineY(102)
    pdf.setTextColor(95, 90, 85)
    pdf.setFont(undefined, 'bold')
    pdf.text('Product', 20, 114)
    pdf.text('Qty', 130, 114)
    pdf.text('Total', 165, 114)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(23, 24, 25)
    pdf.text(invoice.product.name, 20, 124)
    pdf.text(String(invoice.quantity), 130, 124)
    pdf.text(`Rs. ${Number(invoice.order.total).toLocaleString('en-IN')}`, 165, 124)
    lineY(132)
    pdf.setFont(undefined, 'bold')
    pdf.text('Total', 130, 145)
    pdf.text(`Rs. ${Number(invoice.order.total).toLocaleString('en-IN')}`, 165, 145)
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(95, 90, 85)
    pdf.text('Notes', 20, 164)
    pdf.text(invoice.notes || '', 20, 172)
    pdf.text('Terms & Conditions', 20, 190)
    pdf.text(invoice.terms || '', 20, 198, { maxWidth: 165 })
    return pdf
  }

  function downloadInvoice() {
    createInvoicePdf().save(`invoice-${invoice.invoiceNumber}.pdf`)
  }

  function printInvoice() {
    const pdf = createInvoicePdf()
    pdf.autoPrint()
    window.open(pdf.output('bloburl'), '_blank')
  }

  async function shareInvoice() {
    if (!invoice) return
    const invoiceNumber = invoice.invoiceNumber
    const message = `Hi${invoice.customer?.name ? ` ${invoice.customer.name}` : ''}, your invoice #${invoiceNumber} from ${business.name} is ₹${Number(invoice.order.total).toLocaleString('en-IN')}.`
    const pdfBlob = createInvoicePdf().output('blob')
    const pdfFile = new File([pdfBlob], `invoice-${invoiceNumber}.pdf`, { type: 'application/pdf' })
    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({ title: `Invoice #${invoiceNumber}`, text: message, files: [pdfFile] })
        return
      } catch (shareError) {
        if (shareError.name === 'AbortError') return
      }
    }
    downloadInvoice()
    if (invoice.customer?.phone) {
      window.open(`https://wa.me/${invoice.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    } else if (invoice.customer?.email) {
      window.location.href = `mailto:${invoice.customer.email}?subject=${encodeURIComponent(`Invoice #${invoiceNumber}`)}&body=${encodeURIComponent(message)}`
    } else {
      setError('Add a phone or email to the customer profile to share this invoice.')
    }
  }

  return <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className={`dashboard-activity-modal invoice-modal ${invoice ? 'invoice-printable' : ''}`} role="dialog" aria-modal="true" aria-labelledby="create-invoice-title">
      {!invoice ? <form onSubmit={createInvoice}>
        <header className="invoice-create-header">
          <div><h2 id="create-invoice-title">Create Invoice</h2><p>Fill in the details below to create and send an invoice.</p></div>
          <button type="button" className="dashboard-activity-modal-close" aria-label="Close invoice" onClick={onClose}><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="dashboard-activity-modal-body invoice-form-body" data-lenis-prevent>
          {loading ? <p className="dashboard-activity-empty">Loading products and customers...</p> : <>
            <InvoiceFormSection number="1" title="Customer Details" action="+ Add New Customer" onAction={() => setShowCustomerForm((current) => !current)}>
              {showCustomerForm && <div className="invoice-new-customer">
                <div className="invoice-new-customer-heading"><strong>Add New Customer</strong><button type="button" onClick={() => setShowCustomerForm(false)}>Cancel</button></div>
                <div className="invoice-form-grid">
                  <label className="invoice-wide-field"><span>Name *</span><input required autoFocus value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="invoice-wide-field"><span>Phone</span><input type="tel" value={newCustomer.phone} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label className="invoice-wide-field"><span>Email</span><input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} /></label>
                </div>
                <button className="invoice-add-customer-submit" type="button" onClick={addCustomer} disabled={customerSaving}>{customerSaving ? 'Saving...' : 'Save Customer'}</button>
              </div>}
              <label className="invoice-wide-field"><span>Customer *</span><select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label>
              <div className="invoice-address"><span>Billing Address</span><strong>{selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}` : 'Walk-in customer'}</strong><small>{selectedCustomer?.phone || 'No address added'}</small></div>
            </InvoiceFormSection>
            <InvoiceFormSection number="2" title="Invoice Details">
              <div className="invoice-form-grid">
                <label className="invoice-wide-field"><span>Invoice Number *</span><input required value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></label>
                <label className="invoice-wide-field"><span>Invoice Date *</span><input required type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></label>
                <label className="invoice-wide-field"><span>Due Date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
                <label className="invoice-wide-field"><span>Payment Terms</span><select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)}><option>Net 7 Days</option><option>Due on Receipt</option><option>Net 15 Days</option><option>Net 30 Days</option></select></label>
              </div>
            </InvoiceFormSection>
            <InvoiceFormSection number="3" title="Add Products">
              <label className="invoice-wide-field"><span>Product</span><select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Search products by name or SKU...</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name} ({product.quantity} in stock)</option>)}</select></label>
              {selectedProduct && <div className="invoice-product-row"><span className="invoice-product-thumb">{selectedProduct.image_url ? <img src={selectedProduct.image_url} alt="" /> : <Package size={14} />}</span><strong>{selectedProduct.name}<small>SKU: {selectedProduct.sku || 'Not set'}</small></strong><span>{formatCurrency(selectedProduct.selling_price)}</span><input aria-label="Product quantity" min="1" max={selectedProduct.quantity} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /><label className="invoice-discount"><input aria-label="Discount" min="0" max={subtotal} type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} />%</label><strong>{formatCurrency(total)}</strong></div>}
              {selectedProduct && <p className="invoice-add-product">+ Add Product</p>}
            </InvoiceFormSection>
            <InvoiceFormSection number="4" title="Additional Options">
              <label className="invoice-wide-field"><span>Notes (Optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              <label className="invoice-wide-field"><span>Terms & Conditions (Optional)</span><textarea value={terms} onChange={(event) => setTerms(event.target.value)} /></label>
            </InvoiceFormSection>
            {error && <p className="auth-error" role="alert">{error}</p>}
          </>}
        </div>
        <footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Cancel</button><button type="submit" className="inventory-modal-submit" disabled={saving || loading}>{saving ? 'Creating...' : 'Create & Send Invoice'}</button></footer>
      </form> : <>
        <header className="invoice-preview-topbar">
          <div><h2>Invoice Preview</h2><p>This is how the invoice will look.</p></div>
          <div className="invoice-preview-tabs"><button type="button" className="is-active">Preview</button><button type="button">Edit Design</button></div>
          <button type="button" className="dashboard-activity-modal-close" aria-label="Close invoice" onClick={onClose}><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="dashboard-activity-modal-body invoice-preview-body">
          <article className="invoice-paper">
            <div className="invoice-paper-brand"><div><h2>{business.name || 'OPULIT'}</h2><strong>{business.business_type || 'Business'}</strong><small>{selectedCustomer?.email || 'Business invoice'}</small></div><div className="invoice-paper-number"><strong>INVOICE</strong><span>#{invoice.invoiceNumber}</span></div></div>
            <div className="invoice-paper-meta"><span><b>Invoice Date</b>{invoice.invoiceDate}</span><span><b>Due Date</b>{invoice.dueDate}</span><span><b>Payment Terms</b>{invoice.paymentTerms}</span></div>
            <div className="invoice-bill-to"><span>Bill To</span><strong>{invoice.customer?.name || 'Walk-in customer'}</strong><small>{invoice.customer?.email || invoice.customer?.phone || 'No contact details'}</small></div>
            <div className="invoice-preview-table"><div className="invoice-preview-table-head"><span>#</span><span>Product</span><span>Qty</span><span>Price (₹)</span><span>Total (₹)</span></div><div className="invoice-preview-table-row"><span>1</span><span><strong>{invoice.product.name}</strong><small>SKU: {invoice.product.sku || 'Not set'}</small></span><span>{invoice.quantity}</span><span>{Number(invoice.product.selling_price).toLocaleString('en-IN')}</span><span>{Number(invoice.order.total).toLocaleString('en-IN')}</span></div></div>
            <div className="invoice-paper-totals"><span>Subtotal <strong>{formatCurrency(invoice.order.subtotal || invoice.order.total)}</strong></span><span>Discount <strong>- {formatCurrency(invoice.discountAmount)}</strong></span><span>Tax <strong>{formatCurrency(0)}</strong></span><b>Total <strong>{formatCurrency(invoice.order.total)}</strong></b></div>
            <div className="invoice-paper-note"><span>Notes</span><p>{invoice.notes}</p></div>
            <div className="invoice-paper-note"><span>Terms & Conditions</span><p>{invoice.terms}</p></div>
          </article>
        </div>
        <footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Cancel</button><button type="button" className="inventory-modal-cancel" onClick={printInvoice}>Print</button><button type="button" className="inventory-modal-cancel" onClick={downloadInvoice}>Save as PDF</button><button type="button" className="inventory-modal-submit" onClick={shareInvoice}>Create & Send Invoice</button></footer>
      </>}
    </section>
  </div>
}

function InvoiceFormSection({ number, title, action, onAction, children }) {
  return <section className="invoice-form-section">
    <div className="invoice-form-section-heading"><h3><span>{number}</span>{title}</h3>{action && <button type="button" onClick={onAction}>{action}</button>}</div>
    <div className="invoice-form-section-content">{children}</div>
  </section>
}

