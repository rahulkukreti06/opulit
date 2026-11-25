import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import { useEntitlements } from '../hooks/useEntitlements'

export default function RequireFeature({ feature, children }) {
  const { user, loading: authLoading } = useAuth()
  const [businessLookup, setBusinessLookup] = useState(null)
  const currentLookup = businessLookup?.userId === user?.id ? businessLookup : null
  const businessId = currentLookup?.businessId || ''
  const businessLoading = Boolean(user?.id && !currentLookup)
  const businessError = currentLookup?.error || ''
  const entitlements = useEntitlements(businessId)

  useEffect(() => {
    let active = true
    if (!user?.id) return () => { active = false }

    supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setBusinessLookup({
          userId: user.id,
          businessId: error ? '' : data?.id || '',
          error: error?.message || '',
        })
      })
      .catch((error) => {
        if (!active) return
        setBusinessLookup({
          userId: user.id,
          businessId: '',
          error: error.message,
        })
      })

    return () => { active = false }
  }, [user?.id])

  if (authLoading || businessLoading || (businessId && entitlements.loading)) {
    return <p role="status">Loading feature access...</p>
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
