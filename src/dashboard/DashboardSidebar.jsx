import { useEffect, useState } from 'react'
import { BarChart3, ChevronDown, CreditCard, FileText, LayoutDashboard, Package, Settings, Store, UserRound, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import FeatureComingSoonModal from './FeatureComingSoonModal'

const navigationItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Inventory', icon: Package, path: '/dashboard/inventory' },
  { label: 'Customers', icon: Users, path: '/dashboard/customers' },
  { label: 'Billing', icon: FileText, path: '/dashboard/billing' },
  { label: 'Staff', icon: UserRound, comingSoon: true },
  { label: 'Memberships', icon: CreditCard, comingSoon: true },
  { label: 'Reports', icon: BarChart3, comingSoon: true },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

export default function DashboardSidebar() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [comingSoonFeature, setComingSoonFeature] = useState(null)

  useEffect(() => {
    let active = true
    supabase
      .from('businesses')
      .select('name, business_type')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBusiness(data)
      })
    return () => { active = false }
  }, [user.id])

  const businessName = business?.name || 'Your Business'
  const businessType = business?.business_type || 'Business'

  return <aside className="dashboard-sidebar" aria-label="Workspace navigation">
    <div className="dashboard-sidebar-brand">OPULIT</div>
    <nav className="dashboard-sidebar-nav">
      {navigationItems.map(({ label, icon: Icon, path, comingSoon }) => path ? <NavLink className={({ isActive }) => `dashboard-sidebar-item ${isActive ? 'is-active' : ''}`} to={path} end={path === '/dashboard'} key={label}>
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </NavLink> : <button className="dashboard-sidebar-item" type="button" key={label} onClick={() => comingSoon && setComingSoonFeature(label)}>
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </button>)}
    </nav>
    <button className="dashboard-business-switcher" type="button" aria-label={`Current business: ${businessName}`}>
      <span className="dashboard-business-icon"><Store size={16} strokeWidth={1.8} /></span>
      <span className="dashboard-business-copy">
        <strong>{businessName}</strong>
        <small>{businessType}</small>
      </span>
      <ChevronDown className="dashboard-business-chevron" size={14} strokeWidth={2} />
    </button>
    {comingSoonFeature && <FeatureComingSoonModal feature={comingSoonFeature} onClose={() => setComingSoonFeature(null)} />}
  </aside>
}