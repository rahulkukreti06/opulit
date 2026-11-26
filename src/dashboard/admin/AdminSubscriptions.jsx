import { useEffect, useState } from 'react'
import { Shield, Users, CreditCard, Package, Settings, Search, Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'
import DashboardSidebar from '../DashboardSidebar'
import DashboardHeader from '../DashboardHeader'
import DashboardFooter from '../DashboardFooter'
import '../../../css/dashboard.css'

function adminApi(resource, id) {
  const query = new URLSearchParams({ resource })
  if (id) query.set('id', id)
  return `/api/admin?${query.toString()}`
}

async function adminFetch(url, options = {}) {
  const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!currentSession?.access_token) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  let token = currentSession.access_token
  const request = () => fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const response = await request()
  if (response.status !== 401) return response

  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.')
  }

  token = data.session.access_token
  return request()
}

export default function AdminSubscriptions() {
  const { session, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('subscriptions')
  const [searchQuery, setSearchQuery] = useState('')

  // Subscriptions data
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [features, setFeatures] = useState([])
  const [planFeatures, setPlanFeatures] = useState([])
  const [overrides, setOverrides] = useState([])
  const [payments, setPayments] = useState([])

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  // Form state
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && session?.user?.id) checkAdminAccess()
  }, [session, authLoading])

  useEffect(() => {
    if (isAdmin) {
      loadActiveTabData()
    }
  }, [isAdmin, activeTab])

  async function checkAdminAccess() {
    try {
      const { data, error } = await supabase.rpc('is_super_admin', {
        p_user_id: session?.user?.id,
      })

      if (error) throw error
      setIsAdmin(data || false)
    } catch (err) {
      console.error('Failed to check admin access:', err)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveTabData() {
    setError('')
    setSuccess('')

    try {
      const headers = {
        'Content-Type': 'application/json',
      }

      switch (activeTab) {
        case 'subscriptions': {
          const [subRes, planRes] = await Promise.all([
            adminFetch(adminApi('subscriptions'), { headers }),
            adminFetch(adminApi('plans'), { headers }),
          ])
          const [subData, planData] = await Promise.all([subRes.json(), planRes.json()])
          if (!subRes.ok) throw new Error(subData.error || 'Failed to load subscriptions')
          if (!planRes.ok) throw new Error(planData.error || 'Failed to load plans')
          setSubscriptions(subData.subscriptions || [])
          setPlans(planData.plans || [])
          break
        }

        case 'plans': {
          const planRes = await adminFetch(adminApi('plans'), { headers })
          const planData = await planRes.json()
          if (!planRes.ok) throw new Error(planData.error || 'Failed to load plans')
          setPlans(planData.plans || [])
          break
        }

        case 'features': {
          const featRes = await adminFetch(adminApi('features'), { headers })
          const featData = await featRes.json()
          if (!featRes.ok) throw new Error(featData.error || 'Failed to load features')
          setFeatures(featData.features || [])
          break
        }

        case 'overrides': {
          const overrideRes = await adminFetch(adminApi('overrides'), { headers })
          const overrideData = await overrideRes.json()
          if (!overrideRes.ok) throw new Error(overrideData.error || 'Failed to load overrides')
          setOverrides(overrideData.overrides || [])
          break
        }

        case 'plan_features': {
          const [mappingRes, planRes, featureRes] = await Promise.all([
            adminFetch(adminApi('plan_features'), { headers }),
            adminFetch(adminApi('plans'), { headers }),
            adminFetch(adminApi('features'), { headers }),
          ])
          const [mappingData, planData, featureData] = await Promise.all([
            mappingRes.json(),
            planRes.json(),
            featureRes.json(),
          ])
          if (!mappingRes.ok) throw new Error(mappingData.error || 'Failed to load plan features')
          if (!planRes.ok) throw new Error(planData.error || 'Failed to load plans')
          if (!featureRes.ok) throw new Error(featureData.error || 'Failed to load features')
          setPlanFeatures(mappingData.plan_features || [])
          setPlans(planData.plans || [])
          setFeatures(featureData.features || [])
          break
        }

        case 'payments': {
          const paymentRes = await adminFetch(adminApi('payments'), { headers })
          const paymentData = await paymentRes.json()
          if (!paymentRes.ok) throw new Error(paymentData.error || 'Failed to load payments')
          setPayments(paymentData.payments || [])
          break
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const headers = {
        'Content-Type': 'application/json',
      }

      let url, method

      switch (modalType) {
        case 'subscription': {
          const needsManualGrant = selectedItem && (
            selectedItem.plan_id !== formData.plan_id ||
            (formData.status === 'active' && !['active', 'authenticated'].includes(selectedItem.status))
          )
          url = adminApi('subscriptions', selectedItem && !needsManualGrant ? selectedItem.id : undefined)
          method = selectedItem && !needsManualGrant ? 'PUT' : 'POST'
          break
        }
        case 'plan':
          url = adminApi('plans', selectedItem?.id)
          method = selectedItem ? 'PUT' : 'POST'
          break
        case 'feature':
          url = adminApi('features', selectedItem?.id)
          method = selectedItem ? 'PUT' : 'POST'
          break
        case 'override':
          url = adminApi('overrides', selectedItem?.id)
          method = selectedItem ? 'PUT' : 'POST'
          break
        case 'plan_feature':
          url = adminApi('plan_features')
          method = 'POST'
          break
      }

      const requestData = { ...formData }
      if (modalType === 'subscription') {
        requestData.reason = requestData.admin_reason || ''
        delete requestData.admin_reason
      }
      if (modalType === 'plan' && typeof requestData.regional_prices === 'string') {
        requestData.regional_prices = requestData.regional_prices
          ? JSON.parse(requestData.regional_prices)
          : []
      }
      if (modalType === 'override' && requestData.expires_at) {
        requestData.expires_at = new Date(requestData.expires_at).toISOString()
      }
      if (modalType === 'plan_feature' && typeof requestData.limits === 'string') {
        requestData.limits = requestData.limits ? JSON.parse(requestData.limits) : {}
      }

      const res = await adminFetch(url, {
        method,
        headers,
        body: JSON.stringify(requestData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      setSuccess('Saved successfully')
      setShowModal(false)
      setSelectedItem(null)
      setFormData({})
      loadActiveTabData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item, type = modalType) {
    if (!confirm('Are you sure you want to delete this item?')) return

    setSaving(true)
    setError('')

    try {
      let url
      switch (type) {
        case 'subscription':
          url = adminApi('subscriptions', item.id)
          break
        case 'plan':
          url = adminApi('plans', item.id)
          break
        case 'feature':
          url = adminApi('features', item.id)
          break
        case 'override':
          url = adminApi('overrides', item.id)
          break
        case 'plan_feature':
          url = adminApi('plan_features', item.id)
          break
      }

      const res = await adminFetch(url, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')

      setSuccess('Deleted successfully')
      setShowModal(false)
      setSelectedItem(null)
      loadActiveTabData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openModal(type, item = null) {
    setModalType(type)
    setSelectedItem(item)
    setFormData(item
      ? {
          ...item,
          status: type === 'subscription' && item.status === 'created' ? 'active' : item.status,
          limits: type === 'plan_feature' ? JSON.stringify(item.limits || {}, null, 2) : item.limits,
          regional_prices: type === 'plan' ? JSON.stringify(item.regional_prices || [], null, 2) : item.regional_prices,
          expires_at: type === 'override' && item.expires_at
            ? new Date(item.expires_at).toISOString().slice(0, 16)
            : item.expires_at,
        }
      : {})
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <main className="dashboard-page admin-subscriptions-page">
        <div className="dashboard-workspace">
          <DashboardSidebar />
          <section className="dashboard-main">
            <DashboardHeader />
            <div className="dashboard-content dashboard-content-hero">
              <p>Loading admin panel...</p>
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="dashboard-page admin-subscriptions-page">
        <div className="dashboard-workspace">
          <DashboardSidebar />
          <section className="dashboard-main">
            <DashboardHeader />
            <div className="dashboard-content dashboard-content-hero">
              <div className="settings-page-heading admin-page-heading">
                <span className="admin-page-heading-icon"><Shield size={20} /></span>
                <div>
                  <h1>Access Denied</h1>
                  <p>You don't have permission to access the admin panel.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const tabs = [
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'plan_features', label: 'Plan features', icon: Package },
    { id: 'overrides', label: 'Overrides', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ]

  return (
    <main className="dashboard-page admin-subscriptions-page">
      <div className="dashboard-workspace">
        <DashboardSidebar />
        <section className="dashboard-main">
          <DashboardHeader />
          <div className="dashboard-content dashboard-content-hero">
            <div className="settings-page-heading admin-page-heading">
              <span className="admin-page-heading-icon"><Shield size={20} /></span>
              <div>
                <h1>Admin Panel</h1>
                <p>Manage subscriptions, plans, features, and user overrides.</p>
              </div>
            </div>

          {error && (
            <div className="dashboard-alert dashboard-alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button type="button" onClick={() => setError('')}>
                <X size={14} />
              </button>
            </div>
          )}

          {success && (
            <div className="dashboard-alert dashboard-alert-success">
              <Check size={16} />
              <span>{success}</span>
              <button type="button" onClick={() => setSuccess('')}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className="admin-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="management-primary-button"
              type="button"
              disabled={activeTab === 'payments'}
              onClick={() => openModal(activeTab.slice(0, -1))} // subscriptions -> subscription
            >
              <Plus size={16} />
              Add New
            </button>
          </div>

          <div className="admin-table-container" role="region" aria-label="Admin data table; scroll horizontally to view all columns" tabIndex={0}>
            <p className="admin-table-scroll-hint">Swipe horizontally to see all columns</p>
            {activeTab === 'subscriptions' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions
                    .filter((s) =>
                      !searchQuery ||
                      s.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.plans?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.businesses?.name || 'Unknown'}</td>
                        <td>{sub.profiles?.full_name || sub.profiles?.email || 'Unknown'}</td>
                        <td>{sub.plans?.name || sub.plan_id}</td>
                        <td>
                          <span className={`status-badge status-${sub.status}`}>{sub.status}</span>
                        </td>
                        <td>{sub.current_end ? new Date(sub.current_end).toLocaleDateString() : 'No expiry'}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-button"
                            onClick={() => openModal('subscription', sub)}
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'plans' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Price (INR)</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans
                    .filter((p) =>
                      !searchQuery ||
                      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.slug?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((plan) => (
                      <tr key={plan.id}>
                        <td>{plan.name}</td>
                        <td>{plan.slug}</td>
                        <td>₹{(plan.amount / 100).toLocaleString('en-IN')}</td>
                        <td>{plan.is_active ? 'Yes' : 'No'}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-button"
                            onClick={() => openModal('plan', plan)}
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'features' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Availability</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {features
                    .filter((f) =>
                      !searchQuery ||
                      f.feature_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((feature) => (
                      <tr key={feature.id}>
                        <td>{feature.feature_key}</td>
                        <td>{feature.name}</td>
                        <td>{feature.category}</td>
                        <td>{feature.availability || 'available'}</td>
                        <td>{feature.is_active ? 'Yes' : 'No'}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-button"
                            onClick={() => openModal('feature', feature)}
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'overrides' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Feature</th>
                    <th>Enabled</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides
                    .filter((o) =>
                      !searchQuery ||
                      o.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      o.features?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((override) => (
                      <tr key={override.id}>
                        <td>{override.businesses?.name || 'Unknown'}</td>
                        <td>{override.features?.name || override.feature_id}</td>
                        <td>{override.is_enabled ? 'Yes' : 'No'}</td>
                        <td>
                          {override.expires_at
                            ? new Date(override.expires_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-button"
                            onClick={() => openModal('override', override)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-button admin-action-button-danger"
                            onClick={() => handleDelete(override, 'override')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'plan_features' && (
              <table className="admin-table">
                <thead>
                  <tr><th>Plan</th><th>Feature</th><th>Enabled</th><th>Limits</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {planFeatures
                    .filter((mapping) =>
                      !searchQuery ||
                      mapping.plans?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      mapping.features?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      mapping.features?.feature_key?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((mapping) => (
                      <tr key={mapping.id}>
                        <td>{mapping.plans?.name || mapping.plan_id}</td>
                        <td>{mapping.features?.name || mapping.feature_id}</td>
                        <td>{mapping.is_enabled ? 'Yes' : 'No'}</td>
                        <td><code>{JSON.stringify(mapping.limits || {})}</code></td>
                        <td>
                          <button type="button" className="admin-action-button" onClick={() => openModal('plan_feature', mapping)}>
                            <Edit size={14} />
                          </button>
                          <button type="button" className="admin-action-button admin-action-button-danger" onClick={() => handleDelete(mapping, 'plan_feature')}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Razorpay payment</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {payments
                    .filter((payment) =>
                      !searchQuery ||
                      payment.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      payment.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.profile?.full_name || payment.profile?.email || payment.user_id}</td>
                        <td>{payment.plan?.name || payment.plan_id}</td>
                        <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency || 'INR' }).format(Number(payment.amount) / (payment.currency === 'JPY' ? 1 : 100))}</td>
                        <td><span className={`status-badge status-${payment.status}`}>{payment.status}</span></td>
                        <td>{payment.razorpay_payment_id || '—'}</td>
                        <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
          <DashboardFooter />
        </section>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedItem ? `Edit ${modalType}` : `Add ${modalType}`}
              </h2>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {modalType === 'subscription' && (
                <>
                  <label className="management-field">
                    <span>Business ID</span>
                    <input
                      type="text"
                      value={formData.business_id || ''}
                      onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Plan ID</span>
                    <select
                      value={formData.plan_id || ''}
                      onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    >
                      <option value="">Select plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Status</span>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Expires at (optional)</span>
                    <input
                      type="datetime-local"
                      value={formData.current_end ? new Date(formData.current_end).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, current_end: e.target.value || null })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Explanation for this manual change</span>
                    <textarea
                      value={formData.admin_reason || ''}
                      onChange={(e) => setFormData({ ...formData, admin_reason: e.target.value })}
                      required
                    />
                  </label>
                </>
              )}

              {modalType === 'plan' && (
                <>
                  <label className="management-field">
                    <span>Plan ID</span>
                    <input
                      type="text"
                      value={formData.id || ''}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={!!selectedItem}
                    />
                  </label>
                  <label className="management-field">
                    <span>Name</span>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Slug</span>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Amount (minor currency unit)</span>
                    <input
                      type="number"
                      value={formData.amount || 0}
                      onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Billing interval</span>
                    <select
                      value={formData.billing_interval || formData.interval || 'monthly'}
                      onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Currency</span>
                    <input
                      type="text"
                      maxLength={3}
                      value={formData.currency || 'INR'}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Description</span>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Regional prices (JSON array; amounts in minor currency units)</span>
                    <textarea
                      value={formData.regional_prices || '[]'}
                      onChange={(e) => setFormData({ ...formData, regional_prices: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Active</span>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </>
              )}

              {modalType === 'plan_feature' && (
                <>
                  <label className="management-field">
                    <span>Plan</span>
                    <select
                      value={formData.plan_id || ''}
                      onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    >
                      <option value="">Select plan</option>
                      {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Feature</span>
                    <select
                      value={formData.feature_id || ''}
                      onChange={(e) => setFormData({ ...formData, feature_id: e.target.value })}
                    >
                      <option value="">Select feature</option>
                      {features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Enabled</span>
                    <select
                      value={formData.is_enabled ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_enabled: e.target.value === 'true' })}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Limits (JSON object)</span>
                    <textarea
                      value={formData.limits || '{}'}
                      onChange={(e) => setFormData({ ...formData, limits: e.target.value })}
                    />
                  </label>
                </>
              )}

              {modalType === 'feature' && (
                <>
                  <label className="management-field">
                    <span>Feature Key</span>
                    <input
                      type="text"
                      value={formData.feature_key || ''}
                      onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                      disabled={!!selectedItem}
                    />
                  </label>
                  <label className="management-field">
                    <span>Name</span>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Category</span>
                    <input
                      type="text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Description</span>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Active</span>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Availability</span>
                    <select
                      value={formData.availability || 'available'}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    >
                      <option value="available">Available</option>
                      <option value="planned">Planned</option>
                    </select>
                  </label>
                </>
              )}

              {modalType === 'override' && (
                <>
                  <label className="management-field">
                    <span>Business ID</span>
                    <input
                      type="text"
                      value={formData.business_id || ''}
                      onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Feature ID</span>
                    <input
                      type="text"
                      value={formData.feature_id || ''}
                      onChange={(e) => setFormData({ ...formData, feature_id: e.target.value })}
                    />
                  </label>
                  <label className="management-field">
                    <span>Enabled</span>
                    <select
                      value={formData.is_enabled ? 'true' : 'false'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_enabled: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                  <label className="management-field">
                    <span>Reason</span>
                    <input
                      type="text"
                      value={formData.reason || ''}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                    />
                  </label>
                  <label className="management-field">
                    <span>Expires At</span>
                    <input
                      type="datetime-local"
                      value={formData.expires_at || ''}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="management-secondary-button"
                type="button"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="management-primary-button"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
