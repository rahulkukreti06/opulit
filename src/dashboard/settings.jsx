import { useEffect, useState } from 'react'
import { Bell, BriefcaseBusiness, CreditCard, FileText, Link, Package, Store, Trash2, Upload, Users } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { invalidateBusinessEntitlements } from '../hooks/useEntitlements'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import DashboardFooter from './DashboardFooter'
import '../../css/dashboard.css'

const sections = [
  { label: 'Business Profile', description: 'Basic information about your business', icon: BriefcaseBusiness },
  { label: 'Plan & Billing', description: 'Manage your subscription', icon: CreditCard },
  { label: 'Users & Staff', description: 'Manage team members and roles', icon: Users },
  { label: 'Notifications', description: 'Email, SMS and in-app notifications', icon: Bell },
  { label: 'Integrations', description: 'Connect with other tools', icon: Link },
  { label: 'Invoice Settings', description: 'Customize invoices and billing', icon: FileText },
  { label: 'Inventory Settings', description: 'Stock, categories and product options', icon: Package },
  { label: 'Customer Settings', description: 'Customer fields and preferences', icon: Users },
  { label: 'Membership Settings', description: 'Membership plans and configurations', icon: CreditCard },
  { label: 'General', description: 'App preferences and data management', icon: BriefcaseBusiness },
]

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Settings() {
  const { user, session } = useAuth()
  const [form, setForm] = useState({ name: '', business_type: '', business_size: '', role: '' })
  const [profile, setProfile] = useState({ phone: '', address: '', currency: 'INR (₹) - Indian Rupee', timeZone: '(GMT+05:30) Asia/Kolkata', dateFormat: 'DD/MM/YYYY', weekStart: 'Monday' })
  const [businessId, setBusinessId] = useState('')
  const [selectedSection, setSelectedSection] = useState('Business Profile')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancellation, setConfirmCancellation] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')

  useEffect(() => {
    let active = true
    async function loadBusiness() {
      const { data, error: queryError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (!active) return
      if (data) {
        setBusinessId(data.id)
        setForm({
          name: data.name || '',
          business_type: data.business_type || '',
          business_size: data.business_size || '',
          role: data.role || '',
        })
      }
      setError(queryError?.message || '')
      setLoading(false)
    }

    loadBusiness()
    return () => { active = false }
  }, [user.id])

  useEffect(() => {
    if (!businessId || !session?.access_token) {
      setSubscriptionLoading(false)
      return undefined
    }

    let active = true
    setSubscriptionLoading(true)
    setSubscriptionError('')
    fetch(`/api/subscription-status?business_id=${encodeURIComponent(businessId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load subscription details')
        return data
      })
      .then((data) => {
        if (active) setSubscription(data.subscription)
      })
      .catch((requestError) => {
        if (active) setSubscriptionError(requestError.message)
      })
      .finally(() => {
        if (active) setSubscriptionLoading(false)
      })

    return () => { active = false }
  }, [businessId, session?.access_token])

  async function saveSettings(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ form, updated_at: new Date().toISOString() })
      .eq('owner_id', user.id)
    if (updateError) setError(updateError.message)
    else setMessage('Settings saved.')
    setSaving(false)
  }

  async function cancelSubscription() {
    setCancelling(true)
    setSubscriptionError('')
    setMessage('')
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ business_id: businessId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not cancel subscription')
      setSubscription((current) => current ? { ...current, cancel_at_period_end: true } : current)
      setConfirmCancellation(false)
      setMessage('Subscription cancelled. Your plan remains active until the end of the current billing period.')
      invalidateBusinessEntitlements(businessId, user.id)
    } catch (requestError) {
      setSubscriptionError(requestError.message)
    } finally {
      setCancelling(false)
    }
  }

  const isPaidPlan = subscription?.plans?.slug !== 'free'
  const canCancel = isPaidPlan &&
    ['active', 'authenticated'].includes(subscription?.status) &&
    subscription?.payment_provider === 'razorpay' &&
    !subscription?.is_admin_granted &&
    !subscription?.cancel_at_period_end

  return <main className="dashboard-page">
    <div className="dashboard-workspace">
      <DashboardSidebar />
      <section className="dashboard-main">
        <DashboardHeader />
        <div className="dashboard-content dashboard-content-hero">
          <div className="settings-page-heading">
            <h1>Settings</h1>
            <p>Manage your business settings and preferences.</p>
          </div>
          <div className="settings-layout">
            <aside className="settings-menu" aria-label="Settings sections">
              {sections.map(({ label, description, icon: Icon }) => {
                const available = label === 'Business Profile' || label === 'Plan & Billing'
                return <button
                  type="button"
                  className={`settings-menu-item ${selectedSection === label ? 'is-active' : ''}`}
                  key={label}
                  disabled={!available}
                  onClick={() => setSelectedSection(label)}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </button>
              })}
            </aside>
            {loading ? <p>Loading settings...</p> : selectedSection === 'Plan & Billing' ? <section className="settings-panel">
              <div className="settings-panel-header">
                <div>
                  <h2>Plan &amp; Billing</h2>
                  <p>See your current business plan, compare plans, or stop future renewals.</p>
                </div>
                <RouterLink className="management-primary-button" to="/pricing">Upgrade plan</RouterLink>
              </div>
              {subscriptionLoading ? <p className="settings-plan-message">Loading your subscription...</p> : <>
                <div className="settings-plan-card">
                  <div className="settings-plan-card-heading">
                    <div>
                      <span className="settings-plan-label">CURRENT BUSINESS PLAN</span>
                      <h3>{subscription?.plans?.name || 'Free'}</h3>
                    </div>
                    <span className={`settings-plan-status ${subscription?.cancel_at_period_end ? 'is-cancelling' : ''}`}>
                      {subscription?.cancel_at_period_end ? 'Cancels at period end' : (subscription?.status || 'Active')}
                    </span>
                  </div>
                  {subscription?.plans?.description && <p>{subscription.plans.description}</p>}
                  {subscription?.current_end && <p className="settings-plan-period">
                    {subscription.cancel_at_period_end ? 'Access ends' : 'Next billing date'}: {formatDate(subscription.current_end)}
                  </p>}
                  {subscription?.is_admin_granted && <p className="settings-plan-period">This plan is provided by an administrator. Contact your administrator to make changes.</p>}
                </div>
                {subscription?.cancel_at_period_end && <p className="settings-plan-message" role="status">
                  Your plan will remain active until the end of the current billing period.
                </p>}
                {confirmCancellation && <div className="settings-cancel-confirmation" role="group" aria-label="Confirm subscription cancellation">
                  <p>Cancel future renewals? You will keep access to this plan until {formatDate(subscription?.current_end) || 'the end of your current billing period'}.</p>
                  <button type="button" className="settings-danger-button" onClick={cancelSubscription} disabled={cancelling}>
                    {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
                  </button>
                  <button type="button" className="settings-secondary-button" onClick={() => setConfirmCancellation(false)} disabled={cancelling}>
                    Keep subscription
                  </button>
                </div>}
                {!confirmCancellation && canCancel && <div className="settings-plan-actions">
                  <p>Cancellation stops future renewals. Your current plan stays available through the billing period.</p>
                  <button type="button" className="settings-danger-button" onClick={() => setConfirmCancellation(true)}>
                    Cancel subscription
                  </button>
                </div>}
              </>}
              {message && <p className="auth-success" role="status">{message}</p>}
              {subscriptionError && <p className="auth-error" role="alert">{subscriptionError}</p>}
            </section> : <form className="settings-panel" onSubmit={saveSettings}>
              <div className="settings-panel-header">
                <div>
                  <h2>Business Profile</h2>
                  <p>Update your business information. This will be used in invoices, receipts and other documents.</p>
                </div>
                <button className="management-primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
              <div className="settings-logo-row">
                <div className="settings-logo"><Store size={25} strokeWidth={1.8} /></div>
                <div>
                  <h3>Business Logo</h3>
                  <p>Upload a logo to personalize your invoices.</p>
                  <div className="settings-logo-actions">
                    <button type="button" className="settings-secondary-button" disabled><Upload size={13} /> Change Logo</button>
                    <button type="button" className="settings-secondary-button" disabled><Trash2 size={13} /> Remove</button>
                  </div>
                  <small>Recommended size: 512 × 512px (PNG, JPG)</small>
                </div>
              </div>
              <section className="settings-section">
                <h3>Business Information</h3>
                <div className="settings-fields">
                  <label className="management-field"><span>Business Name *</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="management-field"><span>Business Type</span><select value={form.business_type} onChange={(event) => setForm((current) => ({ ...current, business_type: event.target.value }))}><option value="">Select business type</option><option>Retail Business</option><option>Retail / Shop</option><option>Wholesale</option><option>Clinic</option><option>Gym / Fitness</option><option>Salon / Beauty</option></select></label>
                  <label className="management-field"><span>Email Address</span><input type="email" value={user?.email || ''} readOnly /></label>
                  <label className="management-field"><span>Phone Number</span><input value={profile.phone} placeholder="+91 98765 43210" onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label className="management-field settings-field-wide"><span>Business Address</span><textarea value={profile.address} placeholder="Enter your business address" onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))} rows="3" /></label>
                </div>
              </section>
              <section className="settings-section">
                <h3>Business Details</h3>
                <div className="settings-fields">
                  <label className="management-field"><span>Currency</span><select value={profile.currency} onChange={(event) => setProfile((current) => ({ ...current, currency: event.target.value }))}><option>INR (₹) - Indian Rupee</option><option>USD ($) - US Dollar</option></select></label>
                  <label className="management-field"><span>Time Zone</span><select value={profile.timeZone} onChange={(event) => setProfile((current) => ({ ...current, timeZone: event.target.value }))}><option>(GMT+05:30) Asia/Kolkata</option><option>(GMT+00:00) UTC</option></select></label>
                  <label className="management-field"><span>Date Format</span><select value={profile.dateFormat} onChange={(event) => setProfile((current) => ({ ...current, dateFormat: event.target.value }))}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></label>
                  <label className="management-field"><span>First Day of Week</span><select value={profile.weekStart} onChange={(event) => setProfile((current) => ({ ...current, weekStart: event.target.value }))}><option>Monday</option><option>Sunday</option></select></label>
                </div>
              </section>
              {message && <p className="auth-success" role="status">{message}</p>}
              {error && <p className="auth-error" role="alert">{error}</p>}
            </form>}
          </div>
        </div>
        <DashboardFooter />
      </section>
    </div>
  </main>
}
