import { useState } from 'react'
import { Bell, ChevronDown, CircleHelp, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function DashboardHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar_url || null
  const initial = (displayName.trim().charAt(0) || 'U').toUpperCase()

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  return <header className="dashboard-header"><label className="dashboard-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" /><input type="search" placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" /><span className="dashboard-search-shortcut" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span></label>{mobileSearchOpen && <div className="dashboard-mobile-search-overlay"><label className="dashboard-mobile-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" /><input type="search" autoFocus placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" /><button type="button" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}><X size={18} strokeWidth={2.2} /></button></label></div>}<div className="dashboard-header-actions"><button className="dashboard-mobile-search-button" type="button" aria-label="Open search" onClick={() => setMobileSearchOpen(true)}><Search size={20} strokeWidth={2} /></button><button className="dashboard-icon-button has-notification" type="button" aria-label="Notifications"><Bell size={20} strokeWidth={2} /><span /></button><button className="dashboard-icon-button" type="button" aria-label="Help"><CircleHelp size={20} strokeWidth={2} /></button><div className="dashboard-profile"><button className="dashboard-profile-button" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}>{avatar ? <img src={avatar} alt="Profile" className="dashboard-avatar dashboard-avatar-image" /> : <span className="dashboard-avatar" aria-hidden="true">{initial}</span>}<span className="dashboard-profile-name">{displayName}</span><ChevronDown size={16} strokeWidth={2} aria-hidden="true" /></button>{profileMenuOpen && <div className="dashboard-profile-menu"><button type="button" onClick={handleSignOut}>Log out</button></div>}</div></div></header>
}
