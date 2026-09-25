import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import '../../css/dashboard.css'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  async function createBusiness(event) {
    event.preventDefault(); setError(''); setSaving(true)
    const { data, error: insertError } = await supabase.from('businesses').insert({ owner_id: user.id, name: name.trim(), business_type: businessType.trim() || null }).select().single()
    if (insertError) setError(insertError.message)
    else { setBusinesses((current) => [...current, data]); setName(''); setBusinessType('') }
    setSaving(false)
  }

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  return <main className="dashboard-page">
    <header className="dashboard-header"><strong>Opulit</strong><button type="button" onClick={handleSignOut}>Log out</button></header>
    <section className="dashboard-content">
      <p className="dashboard-eyebrow">WORKSPACE</p>
      <h1>Welcome, {user.user_metadata?.full_name || user.email}</h1>
      <p className="dashboard-intro">Create your first business workspace to get started.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading ? <p>Loading your businesses...</p> : businesses.length > 0 ? <div className="business-list">{businesses.map((business) => <article className="business-item" key={business.id}><strong>{business.name}</strong><span>{business.business_type || 'Business workspace'}</span></article>)}</div> : null}
      <form className="business-form" onSubmit={createBusiness}>
        <label htmlFor="businessName">Business name</label>
        <input id="businessName" value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Opulit Studio" />
        <label htmlFor="businessType">Business type <span>(optional)</span></label>
        <input id="businessType" value={businessType} onChange={(event) => setBusinessType(event.target.value)} placeholder="e.g. Salon, clinic, retail" />
        <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create workspace'}</button>
      </form>
    </section>
  </main>
}