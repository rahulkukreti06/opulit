import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Package, Settings2 } from 'lucide-react'

export default function DashboardMobileNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/dashboard/billing', label: 'Invoices', icon: FileText },
    { path: '/dashboard/inventory', label: 'Explore', icon: Package },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings2 },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
  }

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
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
