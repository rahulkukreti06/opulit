import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronRight, CreditCard, Ellipsis, FileText, House, LayoutDashboard, Package, Settings, UserRound, Users, X } from 'lucide-react'
import FeatureComingSoonModal from './FeatureComingSoonModal'

export default function DashboardMobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState(null)

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: House },
    { path: '/dashboard/inventory', label: 'Inventory', icon: Package },
    { path: '/dashboard/customers', label: 'Customers', icon: Users },
    { path: '/dashboard/billing', label: 'Billing', icon: FileText },
    { path: '/dashboard/settings', label: 'More', icon: Ellipsis },
  ]

  const moreItems = [
    { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { path: '/dashboard/inventory', label: 'Inventory', icon: Package },
    { path: '/dashboard/customers', label: 'Customers', icon: Users },
    { path: '/dashboard/billing', label: 'Billing', icon: FileText },
    { label: 'Staff', icon: UserRound, comingSoon: true },
    { label: 'Memberships', icon: CreditCard, comingSoon: true },
    { label: 'Reports', icon: BarChart3, comingSoon: true },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  useEffect(() => {
    if (!moreOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [moreOpen])

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigate = (path) => {
    setMoreOpen(false)
    navigate(path)
  }

  const handleMoreClick = () => setMoreOpen((isOpen) => !isOpen)

  return (
    <nav className="dashboard-mobile-nav">
      <div className="dashboard-mobile-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              type="button"
              className={`dashboard-mobile-nav-item ${isActive(item.path) ? 'is-active' : ''}`}
              onClick={() => item.label === 'More' ? handleMoreClick() : handleNavigate(item.path)}
              aria-label={item.label}
              aria-current={item.label !== 'More' && isActive(item.path) ? 'page' : undefined}
              aria-expanded={item.label === 'More' ? moreOpen : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      {moreOpen && (
        <div className="dashboard-mobile-more-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMoreOpen(false)
        }}>
          <aside className="dashboard-mobile-more-panel" role="dialog" aria-modal="true" aria-label="More dashboard options">
            <header className="dashboard-mobile-more-header">
              <div>
                <strong>OPULIT</strong>
                <span>Workspace</span>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu">
                <X size={18} strokeWidth={1.8} />
              </button>
            </header>
            <nav className="dashboard-mobile-more-list" aria-label="More workspace navigation">
              {moreItems.map((item) => {
                const Icon = item.icon
                const active = item.path && isActive(item.path)
                return item.path ? (
                  <button
                    key={item.path}
                    type="button"
                    className={active ? 'is-active' : ''}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      setComingSoonFeature(item.label)
                    }}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
      {comingSoonFeature && (
        <FeatureComingSoonModal
          feature={comingSoonFeature}
          onClose={() => setComingSoonFeature(null)}
        />
      )}
    </nav>
  )
}                                                                   