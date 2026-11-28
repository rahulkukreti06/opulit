import { useEffect, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import DashboardHelp from './DashboardHelp'
import DashboardAlerts from './DashboardAlerts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

export default function DashboardHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState([])
  const [searchError, setSearchError] = useState('')
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar_url || null
  const initial = (displayName.trim().charAt(0) || 'U').toUpperCase()

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  useEffect(() => {
    let active = true
    async function loadSearchRecords() {
      const business = await supabase.from('businesses').select('id').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1)
      if (!active) return
      if (business.error) { setSearchError('Search is unavailable.'); return }
      const businessId = business.data?.[0]?.id
      if (!businessId) return
      const [customers, products, invoices] = await Promise.all([
        supabase.from('customers').select('id, name').eq('business_id', businessId),
        supabase.from('inventory_products').select('id, name').eq('business_id', businessId),
        supabase.from('sales_orders').select('id, invoice_number').eq('business_id', businessId).eq('status', 'completed'),
      ])
      if (!active) return
      if (customers.error || products.error || invoices.error) { setSearchError('Search is unavailable.'); return }
      setRecords([
        ...(customers.data || []).map((item) => ({ id: item.id, label: item.name, type: 'Customer', path: '/dashboard/customers' })),
        ...(products.data || []).map((item) => ({ id: item.id, label: item.name, type: 'Product', path: '/dashboard/inventory' })),
        ...(invoices.data || []).map((item) => ({ id: item.id, label: item.invoice_number || `INV-${item.id.slice(0, 4).toUpperCase()}`, type: 'Invoice', path: '/dashboard/billing' })),
      ])
    }
    loadSearchRecords()
    return () => { active = false }
  }, [user.id])
  const term = query.trim().toLowerCase()
  const results = term ? records.filter((item) => item.label?.toLowerCase().includes(term)).slice(0, 10) : []
  const dropdown = term && <div className="dashboard-global-results" role="status">{searchError ? <p>{searchError}</p> : results.length ? results.map((item) => <button key={`${item.type}-${item.id}`} type="button" onClick={() => { setQuery(''); setMobileSearchOpen(false); navigate(`${item.path}?search=${encodeURIComponent(item.label)}`) }}><span>{item.label}</span><small>{item.type}</small></button>) : <p>No matching customers, products, or invoices.</p>}</div>
  const input = (autoFocus = false) => <input type="search" autoFocus={autoFocus} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); setMobileSearchOpen(false) } }} placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" />

  return <header className="dashboard-header"><div className="dashboard-global-search"><label className="dashboard-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" />{input()}</label>{!mobileSearchOpen && dropdown}</div>{mobileSearchOpen && <div className="dashboard-mobile-search-overlay"><label className="dashboard-mobile-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" />{input(true)}<button type="button" aria-label="Close search" onClick={() => { setMobileSearchOpen(false); setQuery('') }}><X size={18} /></button></label>{dropdown}</div>}<div className="dashboard-header-actions"><button className="dashboard-mobile-search-button" type="button" aria-label="Open search" onClick={() => setMobileSearchOpen(true)}><Search size={20} strokeWidth={2} /></button><DashboardAlerts /><DashboardHelp /><div className="dashboard-profile"><button className="dashboard-profile-button" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}>{avatar ? <img src={avatar} alt="Profile" className="dashboard-avatar dashboard-avatar-image" /> : <span className="dashboard-avatar" aria-hidden="true">{initial}</span>}<span className="dashboard-profile-name">{displayName}</span><ChevronDown size={16} strokeWidth={2} aria-hidden="true" /></button>{profileMenuOpen && <div className="dashboard-profile-menu"><button type="button" onClick={handleSignOut}>Log out</button></div>}</div></div></header>
}
