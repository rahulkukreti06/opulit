import { useState } from 'react'
import { Bell, ChevronDown, CircleHelp, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function DashboardHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar_url || null
  const initial = (displayName.trim().charAt(0) || 'U').toUpperCase()

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }) }

  return <header className="dashboard-header"><label className="dashboard-search"><Search size={18} strokeWidth={2.2} aria-hidden="true" /><input type="search" placeholder="Search customers, products, invoices..." aria-label="Search customers, products, invoices" /><span className="dashboard-search-shortcut" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span></label><div className="dashboard-header-actions"><button className="dashboard-icon-button has-notification" type="button" aria-label="Notifications"><Bell size={20} strokeWidth={2} /><span /></button><button className="dashboard-icon-button" type="button" aria-label="Help"><CircleHelp size={20} strokeWidth={2} /></button><div className="dashboard-profile"><button className="dashboard-profile-button" type="button" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}>{avatar ? <img src={avatar} alt="Profile" className="dashboard-avatar dashboard-avatar-image" /> : <span className="dashboard-avatar" aria-hidden="true">{initial}</span>}<span className="dashboard-profile-name">{displayName}</span><ChevronDown size={16} strokeWidth={2} aria-hidden="true" /></button>{profileMenuOpen && <div className="dashboard-profile-menu"><button type="button" onClick={handleSignOut}>Log out</button></div>}</div></div></header>
}
