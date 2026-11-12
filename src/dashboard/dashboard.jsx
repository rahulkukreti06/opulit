import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronDown, CircleHelp, CreditCard, Dumbbell, FileText, IndianRupee, MoreHorizontal, Package, ReceiptText, Scissors, Search, ShoppingCart, Stethoscope, Store, UserRound, Users, UsersRound, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { jsPDF } from 'jspdf'
import '../../css/dashboard.css'

const onboardingSteps = [
  { key: 'name', label: 'Business', title: "What's your business name?", description: 'This will be the name of your workspace in Opulit.' },
  { key: 'businessType', label: 'Type', title: 'What type of business do you run?', description: 'This helps us tailor Opulit to your needs.', options: ['Retail / Shop', 'Wholesale', 'Clinic', 'Gym / Fitness', 'Salon / Beauty', 'Other'] },
  { key: 'role', label: 'Role', title: "What's your role in the business?", description: 'This helps us personalise your experience.', options: ['Owner', 'Manager', 'Employee', 'Other'] },
  { key: 'features', label: 'Features', title: 'What would you like to manage with OPULIT?', description: 'Select all that apply. You can always change this later.', options: ['Inventory', 'Customers', 'Billing & Invoices', 'Staff', 'Memberships'], multiple: true },
  { key: 'size', label: 'Size', title: 'How big is your business?', description: 'This helps us understand your business better.', options: ['Just me', '2 - 5 employees', '6 - 20 employees', '20+ employees'] },
]

const initialOnboarding = { name: '', businessType: '', role: '', features: [], size: '' }
const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const businessTypeIcons = { 'Retail / Shop': Store, Wholesale: Package, Clinic: Stethoscope, 'Gym / Fitness': Dumbbell, 'Salon / Beauty': Scissors, Other: MoreHorizontal }
const featureIcons = { Inventory: Package, Customers: Users, 'Billing & Invoices': FileText, Staff: UserRound, Memberships: CreditCard }
const statChartColors = { green: '#42aa6b', amber: '#4b5560', blue: '#5795ff', red: '#ff414b' }

function StatCardChart({ data, accent }) {
  const color = statChartColors[accent]
  const gradientId = `stat-${accent}-area-fill`
  return <div className="dashboard-stat-sparkline" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 1, bottom: 1, left: 1 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="comparison" stroke="#b9b5b1" strokeWidth={1.5} strokeDasharray="1 5" strokeLinecap="round" fill="none" dot={false} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [onboarding, setOnboarding] = useState(initialOnboarding)
  const [otherDetails, setOtherDetails] = useState({ businessType: '', role: '' })
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [revenueRange, setRevenueRange] = useState('30d')
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    let active = true
    supabase.from('businesses').select('*').order('created_at', { ascending: true }).then(({ data, error: queryError }) => {
      if (!active) return
      if (queryError) setError(queryError.message)
      setBusinesses(data ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!showActivityModal) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowActivityModal(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showActivityModal])

  useEffect(() => {
    if (!businesses[0]) return undefined
    let active = true
    async function loadAnalytics() {
      const [ordersResult, customersResult, productsResult, membershipsResult] = await Promise.all([
        supabase.from('sales_orders').select('id, customer_id, total, paid_amount, payment_status, sold_at, created_at, invoice_number').eq('business_id', businesses[0].id).eq('status', 'completed').order('sold_at', { ascending: true }),
        supabase.from('customers').select('id, name, created_at').eq('business_id', businesses[0].id).order('created_at', { ascending: false }),
        supabase.from('inventory_products').select('id, name, quantity, low_stock_alert, created_at').eq('business_id', businesses[0].id).order('created_at', { ascending: false }),
        supabase.from('memberships').select('id, next_payment_due_at').eq('business_id', businesses[0].id),
      ])
      const { data: orders, error: ordersError } = ordersResult
      if (ordersError) {
        if (active) setError(ordersError.message)
        return
      }
      if (customersResult.error || productsResult.error || membershipsResult.error) {
        if (active) setError(customersResult.error?.message || productsResult.error?.message || membershipsResult.error?.message || '')
        return
      }
      const orderIds = (orders || []).map((order) => order.id)
      const { data: items, error: itemsError } = orderIds.length ? await supabase.from('sales_order_items').select('order_id, quantity, unit_price, inventory_products(name, sku)').in('order_id', orderIds) : { data: [], error: null }
      if (itemsError) {
        if (active) setError(itemsError.message)
        return
      }
      if (active) setOrderItems(items || [])
      if (active) setOrders(orders || [])
      const now = new Date()
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousEnd = currentStart
      const currentOrders = (orders || []).filter((order) => new Date(order.sold_at) >= currentStart)
      const previousOrders = (orders || []).filter((order) => new Date(order.sold_at) >= previousStart && new Date(order.sold_at) < previousEnd)
      const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
      const unitsFor = (rows) => {
        const ids = new Set(rows.map((order) => order.id))
        return (items || []).filter((item) => ids.has(item.order_id)).reduce((total, item) => total + Number(item.quantity || 0), 0)
      }
      const percentChange = (current, previous) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100
      const dayCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daily = Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1
        const current = currentOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        const previous = previousOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        return { day, current: sum(current, 'total'), previous: sum(previous, 'total') }
      })
      const dailyOrders = Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1
        const current = currentOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        const previous = previousOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        return { day, current: current.length, previous: previous.length }
      })
      const dailyCustomers = Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1
        const current = currentOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        const previous = previousOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        return {
          day,
          current: new Set(current.filter((order) => order.customer_id).map((order) => order.customer_id)).size,
          previous: new Set(previous.filter((order) => order.customer_id).map((order) => order.customer_id)).size,
        }
      })
      const dailyOutstanding = Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1
        const current = currentOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        const previous = previousOrders.filter((order) => new Date(order.sold_at).getDate() === day)
        return {
          day,
          current: current.reduce((total, order) => total + (Number(order.total || 0) - Number(order.paid_amount || 0)), 0),
          previous: previous.reduce((total, order) => total + (Number(order.total || 0) - Number(order.paid_amount || 0)), 0),
        }
      })
      const currentRevenue = sum(currentOrders, 'total')
      const previousRevenue = sum(previousOrders, 'total')
      const currentCustomers = new Set(currentOrders.filter((order) => order.customer_id).map((order) => order.customer_id)).size
      const previousCustomers = new Set(previousOrders.filter((order) => order.customer_id).map((order) => order.customer_id)).size
      const currentOutstanding = sum(currentOrders, 'total') - sum(currentOrders, 'paid_amount')
      const previousOutstanding = sum(previousOrders, 'total') - sum(previousOrders, 'paid_amount')
      const customerNames = new Map((customersResult.data || []).map((customer) => [customer.id, customer.name]))
      const relativeTime = (dateValue) => {
        const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(dateValue).getTime()) / 60000))
        if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)} min ago`
        if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)} hr ago`
        if (elapsedMinutes < 2880) return 'Yesterday'
        return new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      const saleActivities = (orders || []).slice(-10).map((order) => ({
        id: `order-${order.id}`,
        title: order.invoice_number || `Invoice #${order.id.slice(0, 6).toUpperCase()}`,
        invoiceId: order.id,
        person: customerNames.get(order.customer_id) || 'Walk-in customer',
        amount: formatCurrency(order.total),
        status: order.payment_status === 'partial' ? 'Partial' : order.payment_status === 'unpaid' ? 'Unpaid' : 'Paid',
        tone: order.payment_status === 'paid' ? 'paid' : 'pending',
        time: relativeTime(order.sold_at),
        kind: 'invoice',
        date: new Date(order.sold_at).getTime(),
      }))
      const customerActivities = (customersResult.data || []).slice(0, 10).map((customer) => ({
        id: `customer-${customer.id}`,
        title: 'New customer added',
        person: customer.name,
        amount: '',
        status: '',
        time: relativeTime(customer.created_at),
        kind: 'customer',
        date: new Date(customer.created_at).getTime(),
      }))
      const productActivities = (productsResult.data || []).slice(0, 10).map((product) => ({
        id: `product-${product.id}`,
        title: 'Product added',
        person: product.name,
        amount: '',
        status: '',
        time: relativeTime(product.created_at),
        kind: 'product',
        date: new Date(product.created_at).getTime(),
      }))
      const lowStockProducts = (productsResult.data || []).filter((product) => {
        const threshold = Number(product.low_stock_alert)
        return product.quantity === 0 || product.quantity <= (threshold > 0 ? threshold : 5)
      })
      const overdueOrders = (orders || []).filter((order) => order.payment_status !== 'paid')
      const overdueAmount = overdueOrders.reduce((total, order) => total + Math.max(0, Number(order.total || 0) - Number(order.paid_amount || 0)), 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiryLimit = new Date(today)
      expiryLimit.setDate(expiryLimit.getDate() + 7)
      const expiringMemberships = (membershipsResult.data || []).filter((membership) => {
        if (!membership.next_payment_due_at) return false
        const dueDate = new Date(`${membership.next_payment_due_at}T00:00:00`)
        return dueDate >= today && dueDate <= expiryLimit
      })
      if (active) setAnalytics({
        revenue: { value: currentRevenue, delta: percentChange(currentRevenue, previousRevenue) },
        previousRevenue,
        orders: { value: currentOrders.length, delta: percentChange(currentOrders.length, previousOrders.length), units: unitsFor(currentOrders) },
        customers: { value: currentCustomers, delta: percentChange(currentCustomers, previousCustomers) },
        outstanding: { value: currentOutstanding, delta: percentChange(currentOutstanding, previousOutstanding) },
        daily,
        dailyOrders,
        dailyCustomers,
        dailyOutstanding,
        revenueTimeline: (orders || []).map((order) => ({ date: order.sold_at, value: Number(order.total || 0) })),
        activityItems: [...saleActivities, ...customerActivities, ...productActivities].sort((first, second) => second.date - first.date).slice(0, 10),
      })
    }
    loadAnalytics()
    return () => { active = false }
  }, [businesses])

  function updateOnboarding(value) {
    const step = onboardingSteps[stepIndex]
    setOnboarding((current) => ({ ...current, [step.key]: step.multiple ? (current.features.includes(value) ? current.features.filter((item) => item !== value) : [...current.features, value]) : value }))
  }

  function updateOtherDetail(value) {
    const step = onboardingSteps[stepIndex]
    setOtherDetails((current) => ({ ...current, [step.key]: value }))
  }

  function canContinue() {
    const value = onboarding[onboardingSteps[stepIndex].key]
    if (value === 'Other') return otherDetails[onboardingSteps[stepIndex].key].trim().length > 0
    return Array.isArray(value) ? value.length > 0 : value.trim().length > 0
  }

  async function finishOnboarding() {
    setError(''); setSaving(true)
    const { data, error: insertError } = await supabase.from('businesses').insert({ owner_id: user.id, name: onboarding.name.trim(), business_type: onboarding.businessType === 'Other' ? otherDetails.businessType.trim() : onboarding.businessType, role: onboarding.role === 'Other' ? otherDetails.role.trim() : onboarding.role, features: onboarding.features, business_size: onboarding.size }).select().single()
    if (insertError) setError(insertError.message)
    else setBusinesses([data])
    setSaving(false)
  }

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getDisplayName = () => user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.avatar_url || null
  const userInitial = (getDisplayName().trim().charAt(0) || 'U').toUpperCase()

  const metrics = analytics || {
    revenue: { value: 0, delta: 0 }, previousRevenue: 0, orders: { value: 0, delta: 0, units: 0 },
    customers: { value: 0, delta: 0 }, outstanding: { value: 0, delta: 0 }, daily: [], dailyOrders: [], dailyCustomers: [], dailyOutstanding: [],
  }
  const formatMetric = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  const buildStatChartData = (rows) => (rows || []).map((row, index) => ({
    label: row.day ?? index,
    value: Number(row.current || 0),
    comparison: Number(row.previous || 0),
  }))
  const statCards = [
    { label: 'Revenue', value: formatMetric(metrics.revenue.value), delta: metrics.revenue.delta, dir: metrics.revenue.delta >= 0 ? 'up' : 'down', accent: 'green', icon: IndianRupee, path: '/dashboard/billing', chartData: buildStatChartData(metrics.daily) },
    { label: 'Total Orders', value: `${metrics.orders.value}`, detail: `${metrics.orders.units} products sold`, delta: metrics.orders.delta, dir: metrics.orders.delta >= 0 ? 'up' : 'down', accent: 'amber', icon: ShoppingCart, path: '/dashboard/billing', chartData: buildStatChartData(metrics.dailyOrders) },
    { label: 'Customers', value: `${metrics.customers.value}`, delta: metrics.customers.delta, dir: metrics.customers.delta >= 0 ? 'up' : 'down', accent: 'blue', icon: UsersRound, path: '/dashboard/customers', chartData: buildStatChartData(metrics.dailyCustomers) },
    { label: 'Outstanding', value: formatMetric(metrics.outstanding.value), delta: metrics.outstanding.delta, dir: metrics.outstanding.delta <= 0 ? 'up' : 'down', accent: 'red', icon: ReceiptText, path: '/dashboard/billing', chartData: buildStatChartData(metrics.dailyOutstanding) },
  ]
  const revenueRangeOptions = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '3m', label: '3M' },
    { key: '12m', label: '12M' },
  ]
  const revenueChartData = (() => {
    const now = new Date()
    const rangeDays = { '7d': 7, '30d': 30 }
    const timeline = metrics.revenueTimeline || []
    if (revenueRange === '7d' || revenueRange === '30d') {
      const days = rangeDays[revenueRange]
      return Array.from({ length: days }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + index + 1)
        const comparisonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - days)
        const value = timeline
          .filter((entry) => {
            const entryDate = new Date(entry.date)
            return entryDate.getFullYear() === date.getFullYear() &&
              entryDate.getMonth() === date.getMonth() &&
              entryDate.getDate() === date.getDate()
          })
          .reduce((total, entry) => total + entry.value, 0)
        const comparison = timeline
          .filter((entry) => {
            const entryDate = new Date(entry.date)
            return entryDate.getFullYear() === comparisonDate.getFullYear() &&
              entryDate.getMonth() === comparisonDate.getMonth() &&
              entryDate.getDate() === comparisonDate.getDate()
          })
          .reduce((total, entry) => total + entry.value, 0)
        return { label: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), value, comparison }
      })
    }
    const months = revenueRange === '3m' ? 3 : 12
    return Array.from({ length: months }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1)
      const comparisonDate = new Date(date.getFullYear(), date.getMonth() - months, 1)
      const value = timeline
        .filter((entry) => {
          const entryDate = new Date(entry.date)
          return entryDate.getFullYear() === date.getFullYear() && entryDate.getMonth() === date.getMonth()
        })
        .reduce((total, entry) => total + entry.value, 0)
      const comparison = timeline
        .filter((entry) => {
          const entryDate = new Date(entry.date)
          return entryDate.getFullYear() === comparisonDate.getFullYear() && entryDate.getMonth() === comparisonDate.getMonth()
        })
        .reduce((total, entry) => total + entry.value, 0)
      return { label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value, comparison }
    })
  })()
  const maxRevenue = Math.max(...revenueChartData.flatMap((entry) => [entry.value, entry.comparison]), 1)
  const formatDelta = (value) => `${Math.abs(Number(value) || 0).toFixed(1)}%`
  const formatAxisValue = (value) => value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${Math.round(value)}`
  const formatDateAxisLabel = (label) => label.replace(',', '')
  const renderRevenueTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="dashboard-chart-tooltip">
        <strong>{label}</strong>
        <span><em>This period</em><b>{formatMetric(payload.find((entry) => entry.dataKey === 'value')?.value ?? 0)}</b></span>
        <span><em>Previous period</em><b>{formatMetric(payload.find((entry) => entry.dataKey === 'comparison')?.value ?? 0)}</b></span>
      </div>
    )
  }

  const activityItems = analytics?.activityItems || []

  const openActivityInvoice = (item) => {
    if (item.invoiceId) {
      const order = orders.find((order) => order.id === item.invoiceId)
      if (order) {
        setSelectedInvoice(order)
      }
    }
  }

  function downloadStoredInvoice(invoice) {
    const pdf = new jsPDF()
    pdf.setFontSize(22); pdf.setFont(undefined, 'bold'); pdf.text(businesses[0]?.name || 'OPULIT', 20, 25)
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

  const quickActions = [
    { label: 'Create Invoice', description: 'Generate a new invoice', dark: true, action: () => setShowInvoiceModal(true) },
    { label: 'Add Customer', description: 'Add a new customer', dark: false, path: '/dashboard/customers' },
    { label: 'Add Product', description: 'Add a new product to inventory', dark: false, path: '/dashboard/inventory' },
    { label: 'Add Staff', description: 'Add a team member', dark: false, path: '/dashboard/staff' },
    { label: 'Add Membership', description: 'Create a membership plan', dark: false, path: '/dashboard/memberships' },
  ]

  return <main className="dashboard-page">
    {loading ? <DashboardSkeleton /> : businesses.length === 0 ? <section className="dashboard-content onboarding-content"><Onboarding onboarding={onboarding} otherDetails={otherDetails} stepIndex={stepIndex} error={error} saving={saving} onChange={updateOnboarding} onOtherChange={updateOtherDetail} onBack={() => setStepIndex((current) => current - 1)} onNext={() => stepIndex === onboardingSteps.length - 1 ? finishOnboarding() : setStepIndex((current) => current + 1)} canContinue={canContinue()} /></section> : <div className="dashboard-workspace">
      <DashboardSidebar />
      <section className="dashboard-main">
        <header className="dashboard-header">
          <label className="dashboard-search">
            <Search size={18} strokeWidth={2.2} aria-hidden="true" />
            <input type="search" placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" />
            <span className="dashboard-search-shortcut" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span>
          </label>
          {mobileSearchOpen && <div className="dashboard-mobile-search-overlay"><label className="dashboard-mobile-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" /><input type="search" autoFocus placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" /><button type="button" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}><X size={18} strokeWidth={2.2} /></button></label></div>}
          <div className="dashboard-header-actions">
            <button className="dashboard-mobile-search-button" type="button" aria-label="Open search" onClick={() => setMobileSearchOpen(true)}><Search size={20} strokeWidth={2} /></button>
            <button className="dashboard-icon-button has-notification" type="button" aria-label="Notifications"><Bell size={20} strokeWidth={2} /><span /></button>
            <button className="dashboard-icon-button" type="button" aria-label="Help"><CircleHelp size={20} strokeWidth={2} /></button>
            <div className="dashboard-profile">
              <button className="dashboard-profile-button" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}>
                {googleAvatar ? <img src={googleAvatar} alt="Profile" className="dashboard-avatar dashboard-avatar-image" /> : <span className="dashboard-avatar" aria-hidden="true">{userInitial}</span>}
                <span className="dashboard-profile-name">{getDisplayName()}</span>
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              {profileMenuOpen && <div className="dashboard-profile-menu"><button type="button" onClick={handleSignOut}>Log out</button></div>}
            </div>
          </div>
        </header>
        <div className="dashboard-content dashboard-content-hero">
          <div className="dashboard-greeting-wrap">
            <h1>{getGreeting()}, {getDisplayName()} <span aria-hidden="true">👋</span></h1>
            <p className="dashboard-intro">Here&apos;s what&apos;s happening with your business today.</p>
          </div>

          <div className="dashboard-stat-grid">
            {statCards.map((card) => {
              const Icon = card.icon
              return <article className={`dashboard-stat-card ${card.accent}`} key={card.label}>
                <div className="dashboard-stat-head">
                  <span className={`dashboard-stat-icon ${card.accent}`}><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                  <span className="dashboard-stat-label">{card.label}</span>
                </div>
                <div className="dashboard-stat-value">{card.value}</div>
                <StatCardChart data={card.chartData} accent={card.accent} />
                <div className={`dashboard-stat-trend ${card.dir}`}>
                  {card.dir === 'up' ? <ArrowUpRight className="dashboard-trend-arrow" size={14} aria-hidden="true" /> : <ArrowDownRight className="dashboard-trend-arrow" size={14} aria-hidden="true" />}
                  {formatDelta(card.delta)}
                  <span className="dashboard-trend-text">vs last month</span>
                </div>
              </article>
            })}
          </div>

          <div className="dashboard-report-row">
            <section className="dashboard-panel dashboard-chart-panel" aria-label="Revenue overview">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Revenue Overview</h2>
                  <p>Your total sales over time</p>
                </div>
                <div className="dashboard-chart-filters" aria-label="Revenue range filters">
                  {revenueRangeOptions.map((option) => (
                    <button key={option.key} type="button" className={revenueRange === option.key ? 'is-active' : ''} onClick={() => setRevenueRange(option.key)}>{option.label}</button>
                  ))}
                </div>
              </div>
              <div className="dashboard-chart-plot">
                <div className="dashboard-chart-svg-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="revenue-area-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#15803d" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="#15803d" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f0eeeb" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} tickFormatter={formatDateAxisLabel} />
                      <YAxis tickLine={false} axisLine={false} width={48} tickMargin={8} tickCount={4} tickFormatter={formatAxisValue} domain={[0, maxRevenue]} />
                      <Tooltip content={renderRevenueTooltip} cursor={{ stroke: '#c9c6c2', strokeDasharray: '3 3' }} />
                      <Area type="monotone" dataKey="comparison" name="Previous period" stroke="#b9b5b1" strokeWidth={2} strokeDasharray="1 6" strokeLinecap="round" fill="none" dot={false} activeDot={{ r: 4, fill: '#b9b5b1', stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="value" stroke="#15803d" strokeWidth={2} fill="url(#revenue-area-fill)" dot={false} activeDot={{ r: 5, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <aside className="dashboard-panel dashboard-actions-panel" aria-label="Quick actions">
              <div className="dashboard-actions-header">
                <h2>Quick Actions</h2>
              </div>

              <div className="dashboard-actions-list">
                {quickActions.map((action) => (
                  <button type="button" className={`dashboard-action-item ${action.dark ? 'is-dark' : ''}`} key={action.label} onClick={() => action.action ? action.action() : navigate(action.path)}>
                    <span className="dashboard-action-icon" aria-hidden="true">
                      {action.label.includes('Invoice') || action.label.includes('Sale') ? <FileText size={14} strokeWidth={2.2} /> : action.label.includes('Customer') || action.label.includes('Staff') ? <UserRound size={14} strokeWidth={2.2} /> : action.label.includes('Membership') ? <CreditCard size={14} strokeWidth={2.2} /> : <Package size={14} strokeWidth={2.2} />}
                    </span>
                    <span className="dashboard-action-copy">
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                    <ArrowRight className="dashboard-action-arrow" size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </aside>
          </div>

          <div className="dashboard-bottom-row">
            <section className="dashboard-panel dashboard-activity-panel" aria-label="Recent activity">
              <div className="dashboard-activity-header">
                <h2>Recent Activity</h2>
                <button type="button" onClick={() => setShowActivityModal(true)}>View all <span aria-hidden="true">→</span></button>
              </div>

              <ActivityList items={activityItems.slice(0, 5)} onInvoiceClick={openActivityInvoice} />
            </section>

            <aside className="dashboard-panel dashboard-promo-panel" aria-label="Promo">
              <div className="dashboard-promo-content">
                <div className="dashboard-promo-text">
                  <h3>Powerful. Simple. Yours.</h3>
                  <p>Take your business to the next level with OPULIT.</p>
                  <button type="button" className="dashboard-promo-button">Explore Features →</button>
                </div>
              </div>
            </aside>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}
        </div>
      </section>
      {showInvoiceModal && <InvoiceModal business={businesses[0]} onClose={() => setShowInvoiceModal(false)} />}
      {selectedInvoice && <StoredInvoiceModal invoice={selectedInvoice} items={orderItems.filter((item) => item.order_id === selectedInvoice.id)} onClose={() => setSelectedInvoice(null)} onDownload={() => downloadStoredInvoice(selectedInvoice)} onPrint={() => printStoredInvoice(selectedInvoice)} business={businesses[0]} />}
      {showActivityModal && <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowActivityModal(false)
      }}>
        <section className="dashboard-activity-modal" role="dialog" aria-modal="true" aria-labelledby="recent-activity-title">
          <header className="dashboard-activity-modal-header">
            <div>
              <h2 id="recent-activity-title">Recent Activity</h2>
              <p>Last 10 updates from your business</p>
            </div>
            <button type="button" className="dashboard-activity-modal-close" aria-label="Close recent activity" onClick={() => setShowActivityModal(false)}>
              <X size={17} aria-hidden="true" />
            </button>
          </header>
          <div className="dashboard-activity-modal-body" data-lenis-prevent>
            <ActivityList items={activityItems} onInvoiceClick={openActivityInvoice} />
          </div>
        </section>
      </div>}
    </div>}
  </main>
}

function DashboardSkeleton() {
  return <div className="dashboard-workspace dashboard-skeleton" aria-busy="true" aria-label="Loading dashboard">
    <DashboardSidebar />
    <section className="dashboard-main">
      <DashboardHeader />
      <div className="dashboard-content dashboard-content-hero">
        <div className="dashboard-greeting-wrap dashboard-skeleton-greeting">
          <span className="dashboard-skeleton-line is-title" />
          <span className="dashboard-skeleton-line is-subtitle" />
        </div>
        <div className="dashboard-stat-grid">
          {Array.from({ length: 4 }, (_, index) => <article className="dashboard-stat-card dashboard-skeleton-stat" key={index}>
            <span className="dashboard-skeleton-circle" />
            <span className="dashboard-skeleton-line is-label" />
            <span className="dashboard-skeleton-line is-value" />
            <span className="dashboard-skeleton-line is-trend" />
          </article>)}
        </div>
        <div className="dashboard-report-row">
          <section className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-chart"><span className="dashboard-skeleton-line is-panel-title" /><span className="dashboard-skeleton-line is-panel-copy" /><span className="dashboard-skeleton-chart-lines" /></section>
          <aside className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-list"><span className="dashboard-skeleton-line is-panel-title" />{Array.from({ length: 3 }, (_, index) => <span className="dashboard-skeleton-list-row" key={index}><i className="dashboard-skeleton-circle" /><b className="dashboard-skeleton-line" /><em className="dashboard-skeleton-line" /></span>)}</aside>
        </div>
        <div className="dashboard-bottom-row">
          <section className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-list"><span className="dashboard-skeleton-line is-panel-title" />{Array.from({ length: 4 }, (_, index) => <span className="dashboard-skeleton-list-row" key={index}><i className="dashboard-skeleton-circle" /><b className="dashboard-skeleton-line" /><em className="dashboard-skeleton-line" /></span>)}</section>
          <aside className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-actions"><span className="dashboard-skeleton-line is-panel-title" />{Array.from({ length: 4 }, (_, index) => <span className="dashboard-skeleton-action" key={index} />)}</aside>
        </div>
      </div>
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

function ActivityList({ items, onInvoiceClick }) {
  return <ul className="dashboard-activity-list">
    {items.length === 0 ? <li className="dashboard-activity-empty">No recent activity yet.</li> : items.map((item) => (
      <li className="dashboard-activity-item" key={item.id || item.title}>
        <span className={`dashboard-activity-icon ${item.kind}`} aria-hidden="true">
          {item.kind === 'invoice' ? <FileText size={13} strokeWidth={2.2} /> : item.kind === 'product' ? <Package size={13} strokeWidth={2.2} /> : <UserRound size={13} strokeWidth={2.2} />}
        </span>
        <div className="dashboard-activity-copy">
          {item.kind === 'invoice' ? (
            <button type="button" className="dashboard-activity-title dashboard-activity-title-button" onClick={() => onInvoiceClick(item)}>
              {item.title}
            </button>
          ) : <span className="dashboard-activity-title">{item.title}</span>}
          <span className="dashboard-activity-person">{item.person}</span>
        </div>
        {item.amount && <span className="dashboard-activity-amount">{item.amount}</span>}
        {item.status && <span className={`dashboard-activity-status ${item.tone}`}>{item.status}</span>}
        <span className="dashboard-activity-time">{item.time}</span>
      </li>
    ))}
  </ul>
}

function Onboarding({ onboarding, otherDetails, stepIndex, error, saving, onChange, onOtherChange, onBack, onNext, canContinue }) {
  const step = onboardingSteps[stepIndex]
  const value = onboarding[step.key]
  const isOtherSelected = value === 'Other'
  return <div className="onboarding-shell">
    <aside className="onboarding-sidebar"><strong>OPULIT</strong>{onboardingSteps.map((item, index) => <div className={`onboarding-progress ${index <= stepIndex ? 'is-active' : ''}`} key={item.key}><span>{index < stepIndex ? '✓' : index + 1}</span>{item.label}</div>)}</aside>
    <div className="onboarding-panel"><div className="onboarding-panel-top"><div className="onboarding-progress-track" aria-label={`Onboarding progress: step ${stepIndex + 1} of ${onboardingSteps.length}`}><span style={{ width: `${((stepIndex + 1) / onboardingSteps.length) * 100}%` }} /></div><div className="onboarding-step-count">Step {stepIndex + 1} of {onboardingSteps.length}</div></div><h1>{step.title}</h1><p className="onboarding-description">{step.description}</p>
      {step.options ? <><div className={`onboarding-options ${step.key === 'businessType' || step.key === 'features' ? 'has-business-icons' : ''} ${step.key === 'size' ? 'has-size-options' : ''}`}>{step.options.map((option) => { const OptionIcon = step.key === 'businessType' ? businessTypeIcons[option] : step.key === 'features' ? featureIcons[option] : null; const selected = step.multiple ? value.includes(option) : option === 'Other' ? isOtherSelected : value === option; return <button type="button" className={`onboarding-option ${selected ? 'is-selected' : ''}`} key={option} onClick={() => onChange(option)}>{OptionIcon && <OptionIcon className="business-option-icon" size={22} strokeWidth={1.8} />}<span className={`option-indicator ${step.multiple ? 'is-multiple' : 'is-single'}`}>{step.multiple && value.includes(option) ? '✓' : ''}</span><span>{option}</span></button> })}</div>{isOtherSelected && <input className="onboarding-input other-detail-input" autoFocus value={otherDetails[step.key]} onChange={(event) => onOtherChange(event.target.value)} placeholder={step.key === 'role' ? 'e.g. I manage the day-to-day operations and staff' : 'Tell us about your business in one sentence'} />}</> : <input className="onboarding-input" autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="e.g. Opulit Studio" />}
      {error && <p className="auth-error" role="alert">{error}</p>}<div className="onboarding-actions">{stepIndex > 0 && <button type="button" className="onboarding-back" onClick={onBack}>← Back</button>}<button type="button" className="onboarding-next" disabled={!canContinue || saving} onClick={onNext}>{saving ? 'Saving...' : stepIndex === onboardingSteps.length - 1 ? 'Finish setup →' : 'Next →'}</button></div>
    </div>
  </div>
}

function StoredInvoiceModal({ invoice, items, onClose, onDownload, onPrint, business }) {
  return <div className="dashboard-activity-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="dashboard-activity-modal stored-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="stored-invoice-title">
      <header className="invoice-preview-topbar"><div><h2 id="stored-invoice-title">Invoice {invoice.invoice_number || `#${invoice.id.slice(0, 6).toUpperCase()}`}</h2><p>Saved invoice</p></div><button type="button" className="dashboard-activity-modal-close" onClick={onClose} aria-label="Close invoice"><X size={17} /></button></header>
      <div className="dashboard-activity-modal-body invoice-preview-body"><article className="invoice-paper"><div className="invoice-paper-brand"><div><h2>{business?.name || 'OPULIT'}</h2><strong>{business?.business_type || 'Business'}</strong></div><div className="invoice-paper-number"><strong>INVOICE</strong><span>#{invoice.invoice_number || invoice.id.slice(0, 6).toUpperCase()}</span></div></div><div className="invoice-bill-to"><span>Bill To</span><strong>{invoice.customers?.name || 'Walk-in customer'}</strong><small>{invoice.customers?.email || invoice.customers?.phone || 'No contact details'}</small></div><div className="invoice-preview-table"><div className="invoice-preview-table-head"><span>#</span><span>Product</span><span>Qty</span><span>Price</span><span>Total</span></div>{items.map((item, index) => <div className="invoice-preview-table-row" key={item.order_id + item.inventory_products?.name}><span>{index + 1}</span><span><strong>{item.inventory_products?.name || 'Product'}</strong><small>SKU: {item.inventory_products?.sku || 'Not set'}</small></span><span>{item.quantity}</span><span>{formatCurrency(item.unit_price)}</span><span>{formatCurrency(Number(item.unit_price) * Number(item.quantity))}</span></div>)}</div><div className="invoice-paper-totals"><b>Total <strong>{formatCurrency(invoice.total)}</strong></b></div><div className="invoice-paper-note"><span>Notes</span><p>{invoice.invoice_notes || '—'}</p></div><div className="invoice-paper-note"><span>Terms & Conditions</span><p>{invoice.invoice_terms || '—'}</p></div></article></div><footer className="invoice-modal-footer"><button type="button" className="inventory-modal-cancel" onClick={onClose}>Close</button><button type="button" className="inventory-modal-cancel" onClick={onPrint}>Print</button><button type="button" className="inventory-modal-submit" onClick={onDownload}>Download invoice</button></footer>
    </section>
  </div>
}
