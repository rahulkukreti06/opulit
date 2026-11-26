import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useEntitlements } from '../hooks/useEntitlements'
import { useBusinessLookup } from '../hooks/useBusinessLookup'

export function FeatureAccessSkeleton() {
  return (
    <div className="dashboard-workspace dashboard-skeleton feature-access-skeleton" role="status" aria-label="Loading workspace">
      <aside className="dashboard-sidebar" aria-hidden="true">
        <span className="feature-access-skeleton-brand dashboard-skeleton-line" />
        <nav className="feature-access-skeleton-nav">
          {Array.from({ length: 7 }, (_, index) => <span className="dashboard-skeleton-line" key={index} />)}
        </nav>
      </aside>
      <section className="dashboard-main" aria-hidden="true">
        <header className="dashboard-header feature-access-skeleton-header">
          <span className="dashboard-skeleton-line" />
          <span className="dashboard-skeleton-line" />
        </header>
        <div className="dashboard-content dashboard-content-hero">
          <div className="dashboard-greeting-wrap dashboard-skeleton-greeting">
            <span className="dashboard-skeleton-line is-title" />
            <span className="dashboard-skeleton-line is-subtitle" />
          </div>
          <div className="dashboard-stat-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <article className="dashboard-stat-card dashboard-skeleton-stat" key={index}>
                <span className="dashboard-skeleton-circle" />
                <span className="dashboard-skeleton-line is-label" />
                <span className="dashboard-skeleton-line is-value" />
                <span className="dashboard-skeleton-line is-trend" />
              </article>
            ))}
          </div>
          <div className="dashboard-report-row">
            <section className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-chart">
              <span className="dashboard-skeleton-line is-panel-title" />
              <div className="dashboard-skeleton-chart-plot"><span className="dashboard-skeleton-chart-placeholder" /></div>
            </section>
            <aside className="dashboard-panel dashboard-skeleton-panel dashboard-skeleton-actions">
              {Array.from({ length: 4 }, (_, index) => (
                <span className="dashboard-skeleton-action" key={index}>
                  <i className="dashboard-skeleton-circle" />
                  <b><em className="dashboard-skeleton-line" /><em className="dashboard-skeleton-line" /></b>
                  <small className="dashboard-skeleton-line" />
                </span>
              ))}
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function RequireFeature({ feature, children }) {
  const { user, loading: authLoading } = useAuth()
  const businessLookup = useBusinessLookup(user?.id)
  const { businessId, loading: businessLoading, error: businessError } = businessLookup
  const entitlements = useEntitlements(businessId)

  if (authLoading || businessLoading || (businessId && entitlements.loading)) {
    return <FeatureAccessSkeleton />
  }

  if (businessError || entitlements.error) {
    return <p role="alert">Could not verify feature access: {businessError || entitlements.error}</p>
  }

  if (!businessId) {
    return <p role="status">Create a business in your dashboard to use this feature.</p>
  }

  if (!entitlements.hasFeature(feature)) {
    return (
      <section role="status" aria-live="polite">
        <h1>This feature is not included in your current plan.</h1>
        <p>Choose a plan or contact an administrator to request access.</p>
        <Link to="/pricing">View plans</Link>
      </section>
    )
  }

  return children
}
