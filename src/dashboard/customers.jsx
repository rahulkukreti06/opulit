import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound, Ellipsis, Mail, MapPin, Phone, Plus, Search, Trash2, Upload, Users, UserRoundPlus, UserRoundCheck, UserRoundX, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import '../../css/dashboard.css'

const customerFields = [
  { key: 'name', label: 'Customer name', type: 'text', required: true },
  { key: 'phone', label: 'Phone number', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'became_customer_at', label: 'Customer since', type: 'date' },
]

const emptyForm = () => Object.fromEntries(customerFields.map((field) => [field.key, '']))
const CUSTOMERS_PER_PAGE = 8

function getPaginationItems(totalPages, currentPage) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages]
  if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
  return [1, 'ellipsis', currentPage, 'ellipsis-end', totalPages]
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CU'
}

function formatDate(value, fallback = 'Not provided') {
  if (!value) return fallback
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CustomerAvatar({ name, large = false }) {
  return <span className={`customer-avatar ${large ? 'customer-avatar-large' : ''}`}>{initials(name)}</span>
}

function sparklinePath(points) {
  if (!points.length) return ''
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  return points.map((point, index) => {
    const x = points.length === 1 ? 2 : 2 + (index / (points.length - 1)) * 86
    const y = 34 - ((point - min) / range) * 28
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function StatCard({ icon: Icon, tone, label, value, trend, trendTone = 'up', points }) {
  return <article className={`customer-stat-card ${tone}`}>
    <span className="customer-stat-icon"><Icon size={20} strokeWidth={1.8} /></span>
    <div><p>{label}</p><strong>{value}</strong><small className={trendTone}>{trend}</small></div>
    <svg className="customer-stat-sparkline" viewBox="0 0 90 38" aria-hidden="true"><path d={sparklinePath(points)} /></svg>
  </article>
}

export default function Customers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [rows, setRows] = useState([])
  const [orders, setOrders] = useState([])
  const [memberships, setMemberships] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [actionMenuOpen, setActionMenuOpen] = useState(null)
  const [actionMenuPosition, setActionMenuPosition] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState('Overview')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [orderItems, setOrderItems] = useState([])

  useEffect(() => {
    if (!actionMenuOpen) return undefined
    function closeMenu(event) {
      if (!event.target.closest('.customer-actions-cell, .customer-action-menu')) {
        setActionMenuOpen(null)
        setActionMenuPosition(null)
      }
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [actionMenuOpen])

  useEffect(() => {
    let active = true
    async function loadCustomers() {
      const { data: businesses, error: businessError } = await supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1)
      if (businessError || !businesses?.[0]) {
        if (active) { setError(businessError?.message || 'Create your business from the dashboard first.'); setLoading(false) }
        return
      }
      const currentBusiness = businesses[0]
      const [{ data, error: rowsError }, { data: orderData, error: ordersError }, { data: membershipData, error: membershipsError }] = await Promise.all([
        supabase.from('customers').select('*').eq('business_id', currentBusiness.id).order('created_at', { ascending: false }),
        supabase.from('sales_orders').select('id, customer_id, total, payment_status, sold_at, status, invoice_number, invoice_date, due_date, invoice_notes, invoice_terms, customers(name, email, phone)').eq('business_id', currentBusiness.id).eq('status', 'completed').order('sold_at', { ascending: false }),
        supabase.from('memberships').select('id, customer_id, name, monthly_fee, paid_monthly, next_payment_due_at').eq('business_id', currentBusiness.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      setBusiness(currentBusiness)
      setRows(data ?? [])
      setOrders(orderData ?? [])
      setMemberships(membershipData ?? [])
      setSelectedId(data?.[0]?.id ?? null)
      setError(rowsError?.message || ordersError?.message || membershipsError?.message || '')
      setLoading(false)
      
      const orderIds = (orderData || []).map((order) => order.id)
      const { data: items, error: itemsError } = orderIds.length
        ? await supabase.from('sales_order_items').select('order_id, quantity, unit_price, inventory_products(name, sku)').in('order_id', orderIds)
        : { data: [], error: null }
      if (active) setOrderItems(items || [])
    }
    loadCustomers()
    return () => { active = false }
  }, [user.id])

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchingRows = rows.filter((row) => {
      const matchesQuery = !normalized || [row.name, row.phone, row.email].some((value) => String(value || '').toLowerCase().includes(normalized))
      const matchesStatus = !statusFilter || statusFilter === 'active'
      return matchesQuery && matchesStatus
    })
    return [...matchingRows].sort((a, b) => {
      if (sortOrder === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
      const first = new Date(a.created_at || 0).getTime()
      const second = new Date(b.created_at || 0).getTime()
      return sortOrder === 'oldest' ? first - second : second - first
    })
  }, [query, rows, sortOrder, statusFilter])

  const selectedCustomer = rows.find((row) => row.id === selectedId) || filteredRows[0] || null
  const selectedOrders = selectedCustomer ? orders.filter((order) => order.customer_id === selectedCustomer.id) : []
  const selectedMemberships = selectedCustomer ? memberships.filter((membership) => membership.customer_id === selectedCustomer.id) : []
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / CUSTOMERS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedRows = filteredRows.slice((activePage - 1) * CUSTOMERS_PER_PAGE, activePage * CUSTOMERS_PER_PAGE)
  const firstVisibleCustomer = filteredRows.length === 0 ? 0 : (activePage - 1) * CUSTOMERS_PER_PAGE + 1
  const lastVisibleCustomer = Math.min(activePage * CUSTOMERS_PER_PAGE, filteredRows.length)
  const paginationItems = getPaginationItems(totalPages, activePage)
  const customerMetrics = useMemo(() => {
    const day = 24 * 60 * 60 * 1000
    const dates = Array.from({ length: 7 }, (_, index) => new Date(now - (6 - index) * day))
    const metricsForDate = (date) => {
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      const endTime = end.getTime()
      const customersAtDate = rows.filter((row) => row.created_at && new Date(row.created_at).getTime() <= endTime)
      const newCount = customersAtDate.filter((row) => {
        const created = new Date(row.created_at).getTime()
        return created > endTime - day && created <= endTime
      }).length
      const orderCounts = new Map()
      orders.filter((order) => new Date(order.sold_at).getTime() <= endTime).forEach((order) => {
        if (order.customer_id) orderCounts.set(order.customer_id, (orderCounts.get(order.customer_id) || 0) + 1)
      })
      const returningCount = customersAtDate.filter((row) => (orderCounts.get(row.id) || 0) > 1).length
      const inactiveCount = customersAtDate.filter((row) => {
        const customerOrders = orders.filter((order) => order.customer_id === row.id && new Date(order.sold_at).getTime() <= endTime)
        const lastPurchase = customerOrders.at(-1)?.sold_at
        return !lastPurchase || new Date(lastPurchase).getTime() < endTime - 30 * day
      }).length
      return { total: customersAtDate.length, newCount, returningCount, inactiveCount }
    }
    const timeline = dates.map(metricsForDate)
    return {
      timeline,
      current: timeline.at(-1) || { total: rows.length, newCount: 0, returningCount: 0, inactiveCount: 0 },
    }
  }, [now, orders, rows])
  const newCustomers = customerMetrics.current.newCount
  const returningCustomers = customerMetrics.current.returningCount
  const inactiveCustomers = customerMetrics.current.inactiveCount

  function openAddCustomer() {
    setEditingCustomer(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEditCustomer(customer) {
    setEditingCustomer(customer)
    setForm(Object.fromEntries(customerFields.map((field) => [field.key, customer[field.key] || ''])))
    setActionMenuOpen(null)
    setShowForm(true)
  }

  function toggleActionMenu(event, customerId) {
    event.stopPropagation()
    if (actionMenuOpen === customerId) {
      setActionMenuOpen(null)
      setActionMenuPosition(null)
      return
    }
    const buttonBounds = event.currentTarget.getBoundingClientRect()
    const menuHeight = 130
    const openAbove = buttonBounds.bottom + menuHeight > window.innerHeight
    setActionMenuOpen(customerId)
    setActionMenuPosition({
      left: Math.max(8, buttonBounds.right - 140),
      top: openAbove ? buttonBounds.top - menuHeight - 4 : buttonBounds.bottom + 4,
    })
  }

  async function saveCustomer(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const values = Object.fromEntries(customerFields.filter((field) => form[field.key] !== '').map((field) => [field.key, form[field.key]]))
    const query = editingCustomer
      ? supabase.from('customers').update(values).eq('id', editingCustomer.id).eq('business_id', business.id).select().single()
      : supabase.from('customers').insert({ ...values, business_id: business.id }).select().single()
    const { data, error: saveError } = await query
    if (saveError) setError(saveError.message)
    else if (editingCustomer) {
      setRows((current) => current.map((row) => row.id === data.id ? data : row))
      setSelectedId(data.id)
      setEditingCustomer(null)
      setForm(emptyForm())
      setShowForm(false)
    } else {
      setRows((current) => [data, ...current])
      setSelectedId(data.id)
      setForm(emptyForm())
      setShowForm(false)
    }
    setSaving(false)
  }

  async function removeCustomer(id) {
    setError('')
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else {
      setRows((current) => current.filter((row) => row.id !== id))
      setSelectedId((current) => current === id ? null : current)
    }

  }

  async function removeSelectedCustomers() {
    setError('')
    const { error: deleteError } = await supabase.from('customers').delete().in('id', selectedCustomers)
    if (deleteError) setError(deleteError.message)
    else {
      setRows((current) => current.filter((row) => !selectedCustomers.includes(row.id)))
      setSelectedCustomers([])
      setSelectedId((current) => selectedCustomers.includes(current) ? null : current)
    }
  }

  function openInvoice(order) {
    setSelectedInvoice(order)
  }

  function downloadStoredInvoice(invoice) {
    const pdf = new jsPDF()
    pdf.setFontSize(22); pdf.setFont(undefined, 'bold'); pdf.text(business?.name || 'OPULIT', 20, 25)
    pdf.setFontSize(18); pdf.text('INVOICE', 145, 25)
    pdf.setFontSize(10); pdf.setFont(undefined, 'normal'); pdf.text(`#${invoice.invoice_number}`, 145, 32)
    pdf.text(`Invoice date: ${invoice.invoice_date || new Date(invoice.sold_at).toLocaleDateString()}`, 20, 48)
    pdf.text(`Due date: ${invoice.due_date || '—'}`, 20, 55)
    pdf.text(`Bill to: ${invoice.customers?.name || 'Walk-in customer'}`, 20, 70)
    let y = 90
    orderItems.filter((item) => item.order_id === invoice.id).forEach((item) => {
      pdf.text(`${item.inventory_products?.name || 'Product'} x ${item.quantity}`, 20, y)
      pdf.text(`Rs. ${(Number(item.unit_price) * Number(item.quantity)).toLocaleString('en-IN')}`, 150, y)
      y += 10
    })
    pdf.setFont(undefined, 'bold'); pdf.text(`Total: Rs. ${Number(invoice.total).toLocaleString('en-IN')}`, 130, y + 12)
    pdf.save(`invoice-${invoice.invoice_number || invoice.id.slice(0, 6)}.pdf`)
  }

  function printStoredInvoice(invoice) {
    const printContent = document.querySelector('.stored-invoice-modal .invoice-paper')
    if (!printContent) return
    
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow.document.write('<html><head><title>Invoice</title>')
    printWindow.document.write('<style>')
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }')
    printWindow.document.write('.invoice-paper { max-width: 800px; margin: 0 auto; }')
    printWindow.document.write('.invoice-paper-brand { display: flex; justify-content: space-between; margin-bottom: 20px; }')
    printWindow.document.write('.invoice-paper-brand h2 { margin: 0; font-size: 24px; }')
    printWindow.document.write('.invoice-paper-brand strong { font-size: 14px; }')
    printWindow.document.write('.invoice-paper-number { text-align: right; }')
    printWindow.document.write('.invoice-paper-number strong { font-size: 18px; }')
    printWindow.document.write('.invoice-paper-number span { font-size: 14px; }')
    printWindow.document.write('.invoice-bill-to { margin: 20px 0; }')
    printWindow.document.write('.invoice-bill-to span { font-weight: bold; }')
    printWindow.document.write('.invoice-bill-to strong { font-size: 16px; }')
    printWindow.document.write('.invoice-preview-table { margin: 20px 0; }')
    printWindow.document.write('.invoice-preview-table-head, .invoice-preview-table-row { display: flex; padding: 10px 0; border-bottom: 1px solid #ddd; }')
    printWindow.document.write('.invoice-preview-table-head span { flex: 1; font-weight: bold; }')
    printWindow.document.write('.invoice-preview-table-row span { flex: 1; }')
    printWindow.document.write('.invoice-paper-totals { margin: 20px 0; text-align: right; }')
    printWindow.document.write('.invoice-paper-note { margin: 10px 0; }')
    printWindow.document.write('</style>')
    printWindow.document.write('</head><body>')
    printWindow.document.write(printContent.innerHTML)
    printWindow.document.write('</body></html>')
    printWindow.document.close()
    printWindow.onload = function() {
      printWindow.print()
    }
  }

  return <main className="dashboard-page customer-page">
    <div className="dashboard-workspace">
      <DashboardSidebar />
      <section className="dashboard-main">
        <DashboardHeader />
        <div className="customer-content">
          <div className="customer-title-row">
            <div><h1>Customers</h1><p>Manage your customers, view history and build stronger relationships.</p></div>
            <div className="customer-title-actions"><button className="customer-secondary-button" type="button"><Upload size={15} /> Import</button><button className="customer-primary-button" type="button" onClick={openAddCustomer}><Plus size={16} /> Add Customer</button></div>
          </div>

          <div className="customer-stat-grid">
            <StatCard icon={Users} tone="blue" label="Total Customers" value={rows.length.toLocaleString('en-IN')} trend="All time" points={customerMetrics.timeline.map((metric) => metric.total)} />
            <StatCard icon={UserRoundPlus} tone="neutral" label="New Customers" value={newCustomers} trend="Last 24 hours" points={customerMetrics.timeline.map((metric) => metric.newCount)} />
            <StatCard icon={UserRoundCheck} tone="purple" label="Returning Customers" value={returningCustomers} trend="2+ purchases" points={customerMetrics.timeline.map((metric) => metric.returningCount)} />
            <StatCard icon={UserRoundX} tone="red" label="Inactive Customers" value={inactiveCustomers} trend="No purchase in 30d" trendTone="down" points={customerMetrics.timeline.map((metric) => metric.inactiveCount)} />
          </div>

          {error && <p className="auth-error customer-error" role="alert">{error}</p>}
          <div className="customer-layout">
            <section className="customer-list-panel">
              <div className="customer-panel-heading">
                <div>
                  <h2>All Customers ({rows.length.toLocaleString('en-IN')})</h2>
                  <p>Track and manage all your customers</p>
                </div>
                {selectedCustomers.length > 0 && <div className="customer-bulk-actions"><span><b><Check size={11} /></b>{selectedCustomers.length} customer{selectedCustomers.length === 1 ? '' : 's'} selected</span><button type="button" onClick={removeSelectedCustomers}><Trash2 size={13} /> Delete</button></div>}
              </div>
              <div className="customer-filter-row">
                <label className="customer-list-search"><Search size={16} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search customers..." aria-label="Search customers" /></label>
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }} aria-label="Filter by status"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
                <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setCurrentPage(1) }} aria-label="Sort customers"><option value="latest">Latest Added</option><option value="oldest">Oldest Added</option><option value="name">Name</option></select>
              </div>
              <div className="customer-table-scroll"><table className="customer-table"><thead><tr><th><input type="checkbox" checked={paginatedRows.length > 0 && paginatedRows.every((row) => selectedCustomers.includes(row.id))} onChange={(event) => setSelectedCustomers(event.target.checked ? [...new Set([...selectedCustomers, ...paginatedRows.map((row) => row.id)])] : selectedCustomers.filter((id) => !paginatedRows.some((row) => row.id === id)))} aria-label="Select all customers" /></th><th>Customer</th><th>Phone</th><th>Total Spent</th><th>Last Purchase</th><th>Status</th><th /></tr></thead><tbody>
                {loading ? <tr><td className="customer-table-empty" colSpan="7">Loading customers...</td></tr> : filteredRows.length === 0 ? <tr><td className="customer-table-empty" colSpan="7">No customers found.</td></tr> : paginatedRows.map((row) => <tr className={selectedCustomer?.id === row.id ? 'is-selected' : ''} key={row.id} onClick={() => setSelectedId(row.id)}>
                  <td onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedCustomers.includes(row.id)} onChange={(event) => setSelectedCustomers((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} aria-label={`Select ${row.name}`} /></td><td><span className="customer-name-cell"><CustomerAvatar name={row.name} /><span><strong>{row.name}</strong><small>{row.email || 'Customer profile'}</small></span></span></td><td>{row.phone || '—'}</td><td>{orders.filter((order) => order.customer_id === row.id).reduce((total, order) => total + Number(order.total || 0), 0) ? `₹${orders.filter((order) => order.customer_id === row.id).reduce((total, order) => total + Number(order.total || 0), 0).toLocaleString('en-IN')}` : '—'}</td><td>{formatDate(orders.find((order) => order.customer_id === row.id)?.sold_at, '—')}</td><td><span className="customer-status active"><Check size={11} /> Active</span></td><td className="customer-actions-cell"><button className="customer-more-button" type="button" aria-label={`Actions for ${row.name}`} onClick={(event) => toggleActionMenu(event, row.id)}><Ellipsis size={17} /></button></td>
                </tr>)}
              </tbody></table></div>
              {actionMenuOpen && actionMenuPosition && (() => {
                const customer = rows.find((row) => row.id === actionMenuOpen)
                if (!customer) return null
                return <div className="customer-action-menu customer-action-menu-fixed" style={actionMenuPosition} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setSelectedId(customer.id); setActionMenuOpen(null); setActionMenuPosition(null) }}>View customer</button><button type="button" onClick={() => openEditCustomer(customer)}>Edit customer</button><button className="is-danger" type="button" onClick={() => { setActionMenuOpen(null); setActionMenuPosition(null); removeCustomer(customer.id) }}>Delete customer</button></div>
              })()}
              <div className="customer-table-footer"><span>Showing {firstVisibleCustomer}–{lastVisibleCustomer} of {filteredRows.length} customers</span><div className="inventory-pagination"><button type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={activePage === 1} aria-label="Previous page"><ChevronLeft size={17} strokeWidth={2.25} /></button>{paginationItems.map((item) => item.toString().startsWith('ellipsis') ? <span className="inventory-pagination-ellipsis" key={item}>...</span> : <button className={item === activePage ? 'is-active' : ''} type="button" key={item} onClick={() => setCurrentPage(item)}>{item}</button>)}<button type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={activePage === totalPages} aria-label="Next page"><ChevronRight size={17} strokeWidth={2.25} /></button></div></div>
            </section>

            <aside className="customer-detail-panel">
              {selectedCustomer ? <><div className="customer-detail-heading"><CustomerAvatar name={selectedCustomer.name} large /><div><h2>{selectedCustomer.name}</h2><span className="customer-status active">Active</span><p>Customer since {formatDate(selectedCustomer.became_customer_at || selectedCustomer.created_at)}</p></div><button className="customer-more-button" type="button" aria-label="Customer actions"><Ellipsis size={18} /></button></div>
                <div className="customer-tabs">{['Overview', 'Purchases', 'Memberships', 'Notes'].map((tab) => <button className={activeTab === tab ? 'is-active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
                {activeTab === 'Overview' && <><div className="customer-contact-card"><p><Phone size={15} />{selectedCustomer.phone || 'Phone not provided'}</p><p><Mail size={15} />{selectedCustomer.email || 'Email not provided'}</p><p><MapPin size={15} />Location not provided</p><p><CalendarDays size={15} />Customer since {formatDate(selectedCustomer.became_customer_at || selectedCustomer.created_at)}</p></div><div className="customer-summary-grid"><div><strong>₹{selectedOrders.reduce((total, order) => total + Number(order.total || 0), 0).toLocaleString('en-IN')}</strong><span>Total Spent</span></div><div><strong>{selectedOrders.length}</strong><span>Total Orders</span></div><div><strong>{selectedMemberships.length}</strong><span>Memberships</span></div></div><div className="customer-purchases"><div className="customer-section-heading"><h3>Recent Purchases</h3><button type="button" onClick={() => setActiveTab('Purchases')}>View all →</button></div>{selectedOrders.slice(0, 3).map((order) => <CustomerPurchaseRow key={order.id} order={order} onOpen={() => openInvoice(order)} />)}{selectedOrders.length === 0 && <p className="customer-no-purchases">No purchase history yet.</p>}</div></>}
                {activeTab === 'Purchases' && <div className="customer-tab-content"><h3>Purchase history</h3>{selectedOrders.length ? selectedOrders.map((order) => <CustomerPurchaseRow key={order.id} order={order} onOpen={() => openInvoice(order)} />) : <p className="customer-no-purchases">No purchase history yet.</p>}</div>}
                {activeTab === 'Memberships' && <div className="customer-tab-content"><h3>Memberships</h3>{selectedMemberships.length ? selectedMemberships.map((membership) => <p className="customer-purchase-row" key={membership.id}><span>{membership.name}<small>Next payment {formatDate(membership.next_payment_due_at, 'Not scheduled')}</small></span><strong>₹{Number(membership.monthly_fee || 0).toLocaleString('en-IN')}</strong><em>{membership.paid_monthly ? 'Paid' : 'Pending'}</em></p>) : <p className="customer-no-purchases">No memberships yet.</p>}</div>}
                {activeTab === 'Notes' && <div className="customer-tab-content"><h3>Notes</h3><textarea className="customer-notes" placeholder="Add notes about this customer..." aria-label="Customer notes" /></div>}
                <div className="customer-detail-actions"><button type="button" disabled={!selectedCustomer.email} onClick={() => { window.location.href = `mailto:${selectedCustomer.email}` }}><Mail size={15} /> Message</button><button type="button" onClick={() => navigate('/dashboard/billing', { state: { customerId: selectedCustomer.id } })}><Plus size={15} /> Create Invoice</button></div>
              </> : <div className="customer-detail-empty"><CircleUserRound size={32} /><h2>Select a customer</h2><p>Choose a customer from the list to view their details.</p></div>}
            </aside>
          </div>
        </div>
      </section>
    </div>
    {showForm && <div className="customer-modal-backdrop" role="presentation"><form className="customer-modal" onSubmit={saveCustomer}><div className="customer-modal-header"><div><h2>{editingCustomer ? 'Edit customer' : 'Add customer'}</h2><p>{editingCustomer ? 'Update this customer profile.' : 'Create a new customer profile.'}</p></div><button type="button" className="customer-modal-close" onClick={() => { setShowForm(false); setEditingCustomer(null) }} aria-label="Close"><X size={18} /></button></div><div className="customer-modal-fields">{customerFields.map((field) => <label key={field.key}><span>{field.label}{field.required && ' *'}</span><input required={field.required} type={field.type} value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}</div><div className="customer-modal-actions"><button type="button" onClick={() => { setShowForm(false); setEditingCustomer(null) }}>Cancel</button><button type="submit" disabled={saving || !business}>{saving ? 'Saving...' : editingCustomer ? 'Save changes' : 'Add customer'}</button></div></form></div>}
    {selectedInvoice && <StoredInvoiceModal invoice={selectedInvoice} items={orderItems.filter((item) => item.order_id === selectedInvoice.id)} onClose={() => setSelectedInvoice(null)} onDownload={() => downloadStoredInvoice(selectedInvoice)} onPrint={() => printStoredInvoice(selectedInvoice)} business={business} />}
  </main>
}

function CustomerPurchaseRow({ order, onOpen }) {
  return <p className="customer-purchase-row">
    <span>
      <button type="button" className="customer-invoice-link" onClick={onOpen}>
        {order.invoice_number || `Invoice #${order.id.slice(0, 6).toUpperCase()}`}
      </button>
      <small>{formatDate(order.sold_at)}</small>
    </span>
    <strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong>
    <em>{order.payment_status}</em>
  </p>
}

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

function StoredInvoiceModal({ invoice, items, onClose, onDownload, onPrint, business }) {
  return <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="dashboard-activity-modal stored-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="stored-invoice-title">
      <header className="invoice-preview-topbar"><div><h2 id="stored-invoice-title">Invoice {invoice.invoice_number || `#${invoice.id.slice(0, 6).toUpperCase()}`}</h2><p>Saved invoice</p></div><button type="button" className="dashboard-activity-modal-close" onClick={onClose} aria-label="Close invoice"><X size={17} /></button></header>
      <div className="dashboard-activity-modal-body invoice-preview-body"><article className="invoice-paper"><div className="invoice-paper-brand"><div><h2>{business?.name || 'OPULIT'}</h2><strong>{business?.business_type || 'Business'}</strong></div><div className="invoice-paper-number"><strong>INVOICE</strong><span>#{invoice.invoice_number || invoice.id.slice(0, 6).toUpperCase()}</span></div></div><div className="invoice-bill-to"><span>Bill To</span><strong>{invoice.customers?.name || 'Walk-in customer'}</strong><small>{invoice.customers?.email || invoice.customers?.phone || 'No contact details'}</small></div><div className="invoice-preview-table"><div className="invoice-preview-table-head"><span>#</span><span>Product</span><span>Qty</span><span>Price</span><span>Total</span></div>{items.map((item, index) => <div className="invoice-preview-table-row" key={item.order_id + item.inventory_products?.name}><span>{index + 1}</span><span><strong>{item.inventory_products?.name || 'Product'}</strong><small>SKU: {item.inventory_products?.sku || 'Not set'}</small></span><span>{item.quantity}</span><span>{formatCurrency(item.unit_price)}</span><span>{formatCurrency(Number(item.unit_price) * Number(item.quantity))}</span></div>)}</div><div className="invoice-paper-totals"><b>Total <strong>{formatCurrency(invoice.total)}</strong></b></div><div className="invoice-paper-note"><span>Notes</span><p>{invoice.invoice_notes || '—'}</p></div><div className="invoice-paper-note"><span>Terms & Conditions</span><p>{invoice.invoice_terms || '—'}</p></div></article></div><footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Close</button><button type="button" className="inventory-modal-cancel" onClick={onPrint}>Print</button><button type="button" className="inventory-modal-submit" onClick={onDownload}>Download invoice</button></footer>
    </section>
  </div>
}
