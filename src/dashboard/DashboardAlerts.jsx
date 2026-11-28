import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

const DISMISS_MS = 12 * 60 * 60 * 1000
function readDismissals(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {} } catch { return {} }
}

export default function DashboardAlerts() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dismissKey = `dashboard-alert-dismissals:${user.id}`
  const [dismissed, setDismissed] = useState(() => readDismissals(dismissKey))
  const [dismissError, setDismissError] = useState('')
  const [now, setNow] = useState(Date.now)
  const container = useRef(null)
  const request = useRef(0)

  const loadAlerts = useCallback(async () => {
    const current = ++request.current
    setLoading(true)
    setError('')
    try {
      const business = await supabase.from('businesses').select('id').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1)
      if (business.error) throw business.error
      const businessId = business.data?.[0]?.id
      if (!businessId) { if (current === request.current) setAlerts([]); return }
      const [products, invoices, memberships] = await Promise.all([
        supabase.from('inventory_products').select('id, name, quantity, low_stock_alert').eq('business_id', businessId),
        supabase.from('sales_orders').select('id, invoice_number, total, paid_amount, payment_status, due_date').eq('business_id', businessId).eq('status', 'completed'),
        supabase.from('memberships').select('id, name, paid_monthly, next_payment_due_at, customers(name)').eq('business_id', businessId),
      ])
      if (products.error || invoices.error || memberships.error) throw products.error || invoices.error || memberships.error
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const end = new Date(today); end.setDate(end.getDate() + 7)
      const entries = []
      for (const product of products.data || []) {
        const quantity = Number(product.quantity)
        const threshold = Number(product.low_stock_alert) > 0 ? Number(product.low_stock_alert) : 5
        if (quantity <= threshold) entries.push({ id: `product-${product.id}`, title: quantity === 0 ? 'Out of stock' : 'Low stock', detail: `${product.name} · ${quantity} remaining`, path: `/dashboard/inventory?search=${encodeURIComponent(product.name)}` })
      }
      for (const invoice of invoices.data || []) {
        if (invoice.payment_status === 'paid') continue
        const label = invoice.invoice_number || `INV-${invoice.id.slice(0, 4).toUpperCase()}`
        const due = invoice.due_date ? new Date(`${invoice.due_date}T00:00:00`) : null
        const overdue = invoice.payment_status === 'overdue' || (due && due < today)
        const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.paid_amount || 0))
        entries.push({ id: `invoice-${invoice.id}`, title: overdue ? 'Overdue invoice' : 'Unpaid invoice', detail: `${label} · ₹${balance.toLocaleString('en-IN')} outstanding`, path: `/dashboard/billing?search=${encodeURIComponent(label)}` })
      }
      for (const membership of memberships.data || []) {
        const due = membership.next_payment_due_at ? new Date(`${membership.next_payment_due_at}T00:00:00`) : null
        const soon = due && !Number.isNaN(due.getTime()) && due <= end
        if (!membership.paid_monthly || soon) {
          const customer = membership.customers?.name
          const dueText = soon ? ` · payment ${due < today ? 'was' : 'is'} due ${due.toLocaleDateString('en-IN')}` : ''
          entries.push({ id: `membership-${membership.id}`, title: !membership.paid_monthly ? 'Unpaid membership' : due < today ? 'Membership payment date passed' : 'Membership payment due soon', detail: `${membership.name}${customer ? ` · ${customer}` : ''}${dueText}`, path: customer ? `/dashboard/customers?search=${encodeURIComponent(customer)}` : '/dashboard/customers' })
        }
      }
      if (current === request.current) setAlerts(entries)
    } catch {
      if (current === request.current) { setAlerts([]); setError('Could not load alerts. Please try again.') }
    } finally {
      if (current === request.current) setLoading(false)
    }
  }, [user.id])

  useEffect(() => { loadAlerts(); return () => { request.current += 1 } }, [loadAlerts])
  useEffect(() => {
    setDismissed(readDismissals(dismissKey))
    function sync(event) { if (event.key === dismissKey) setDismissed(readDismissals(dismissKey)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [dismissKey])
  useEffect(() => {
    const next = Math.min(...Object.values(dismissed).filter((time) => typeof time === 'number' && time > now))
    if (!Number.isFinite(next)) return undefined
    const timer = window.setTimeout(() => { setNow(Date.now()); loadAlerts() }, Math.max(0, next - Date.now()))
    return () => window.clearTimeout(timer)
  }, [dismissed, now, loadAlerts])

  function dismissAlert(id) {
    const time = Date.now()
    const next = Object.fromEntries(Object.entries(readDismissals(dismissKey)).filter(([, expiry]) => typeof expiry === 'number' && expiry > time))
    next[id] = time + DISMISS_MS
    try {
      localStorage.setItem(dismissKey, JSON.stringify(next))
      setDismissed(next)
      setNow(time)
      setDismissError('')
    } catch { setDismissError('Could not dismiss this alert. Please check browser storage.') }
  }
  const visibleAlerts = alerts.filter((alert) => !(dismissed[alert.id] > now))
  useEffect(() => {
    if (!open) return undefined
    function outside(event) { if (!container.current?.contains(event.target)) setOpen(false) }
    function keydown(event) { if (event.key === 'Escape') { setOpen(false); container.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keydown) }
  }, [open])

  return <div className="dashboard-alerts" ref={container}>
    <button className={`dashboard-icon-button ${visibleAlerts.length ? 'has-notification' : ''}`} type="button" aria-label={visibleAlerts.length ? `Notifications, ${visibleAlerts.length} alerts` : 'Notifications'} aria-expanded={open} onClick={() => { if (!open) { setNow(Date.now()); loadAlerts() } setOpen(!open) }}><Bell size={20} strokeWidth={2} />{visibleAlerts.length > 0 && <span />}</button>
    {open && <div className="dashboard-alerts-menu"><div className="dashboard-alerts-heading"><strong>Alerts</strong><span>{visibleAlerts.length > 0 ? `${visibleAlerts.length} need attention` : ''}</span></div><div className="dashboard-alerts-list">{dismissError && <p role="alert">{dismissError}</p>}{loading ? <p>Loading alerts…</p> : error ? <p>{error} <button className="dashboard-alerts-retry" type="button" onClick={loadAlerts}>Retry</button></p> : visibleAlerts.length ? visibleAlerts.map((alert) => <div className="dashboard-alert-row" key={alert.id}><button className="dashboard-alert-link" type="button" onClick={() => { setOpen(false); navigate(alert.path) }}><strong>{alert.title}</strong><small>{alert.detail}</small></button><button className="dashboard-alert-dismiss" type="button" aria-label={`Dismiss ${alert.title}: ${alert.detail} for 12 hours`} title="Dismiss for 12 hours" onClick={() => dismissAlert(alert.id)}><X size={16} aria-hidden="true" /></button></div>) : <p>No alerts right now.</p>}</div></div>}
  </div>
}
