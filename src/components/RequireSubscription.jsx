import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useEntitlements } from '../hooks/useEntitlements'
import { useBusinessLookup } from '../hooks/useBusinessLookup'
import { FeatureAccessSkeleton } from './RequireFeature'

export default function RequireSubscription() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const businessLookup = useBusinessLookup(user?.id)
  const { businessId, isAdmin, loading: businessLoading, error: businessError } = businessLookup
  const entitlements = useEntitlements(businessId)

  if (authLoading || businessLoading || (businessId && entitlements.loading)) {
    return <FeatureAccessSkeleton />
  }

  if (businessError || entitlements.error) {
    return <p role="alert">Could not verify your subscription: {businessError || entitlements.error}</p>
  }

  if (isAdmin) return <Outlet />

  if (!businessId) {
    return location.pathname === '/dashboard'
      ? <Outlet />
      : <Navigate to="/dashboard" replace />
  }

  const subscription = entitlements.subscription
  const hasPaidSubscription = subscription &&
    subscription.plan_slug !== 'free' &&
    ['active', 'authenticated'].includes(subscription.status)

  if (!hasPaidSubscription) {
    return (
      <section role="status" aria-live="polite">
        <h1>Choose a plan to access your workspace.</h1>
        <p>Your account is ready. Select a plan and complete payment to unlock its features.</p>
        <Link to="/pricing">View plans and pay</Link>
      </section>
    )
  }

  return <Outlet />
}
