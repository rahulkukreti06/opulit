import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/authContext'

/**
 * React hook for checking feature entitlements
 *
 * @param {string} businessId - The business UUID to check entitlements for
 * @returns {Object} Entitlement data and helper functions
 */
export function useEntitlements(businessId) {
  const { session } = useContext(AuthContext)
  const [result, setResult] = useState(null)
  const userId = session?.user?.id

  useEffect(() => {
    if (!businessId || !session?.access_token) return

    let mounted = true

    async function fetchEntitlements() {
      try {
        const response = await fetch(`/api/entitlements?business_id=${businessId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch entitlements')
        }

        const data = await response.json()

        if (mounted) {
          setResult({
            businessId,
            userId,
            subscription: data.subscription,
            features: data.features || [],
            limits: data.limits || {},
            error: null,
          })
        }
      } catch (err) {
        if (mounted) {
          setResult({
            businessId,
            userId,
            subscription: null,
            features: [],
            limits: {},
            error: err.message,
          })
          console.error('Failed to fetch entitlements:', err)
        }
      }
    }

    fetchEntitlements()

    return () => {
      mounted = false
    }
  }, [businessId, session?.access_token, userId])

  const currentResult = result?.businessId === businessId && result?.userId === userId
    ? result
    : null
  const loading = Boolean(businessId && session?.access_token && !currentResult)
  const error = currentResult?.error || null
  const subscription = currentResult?.subscription || null
  const features = currentResult?.features || []
  const limits = currentResult?.limits || {}

  /**
   * Check if a specific feature is enabled
   * @param {string} featureKey - The feature key to check
   * @returns {boolean} Whether the feature is accessible
   */
  const hasFeature = (featureKey) => {
    const feature = features.find((f) => f.feature_key === featureKey)
    return feature?.hasAccess || false
  }

  /**
   * Get the limit for a specific feature
   * @param {string} featureKey - The feature key to get limit for
   * @returns {object} The limit object (e.g., { max_products: 500 })
   */
  const getLimit = (featureKey) => {
    const feature = features.find((f) => f.feature_key === featureKey)
    return feature?.limit || {}
  }

  /**
   * Get a specific limit value
   * @param {string} featureKey - The feature key
   * @param {string} limitKey - The limit key (e.g., 'max_products')
   * @returns {number|string|null} The limit value or null if not set
   */
  const getLimitValue = (featureKey, limitKey) => {
    const limit = getLimit(featureKey)
    return limit[limitKey] !== undefined ? limit[limitKey] : null
  }

  /**
   * Check if a feature has a specific limit
   * @param {string} featureKey - The feature key
   * @param {string} limitKey - The limit key
   * @returns {boolean} Whether the limit exists
   */
  const hasLimit = (featureKey, limitKey) => {
    return getLimitValue(featureKey, limitKey) !== null
  }

  /**
   * Get the current plan information
   * @returns {object|null} Plan info or null
   */
  const getCurrentPlan = () => {
    return subscription?.plan_name ? {
      id: subscription.plan_id,
      name: subscription.plan_name,
      slug: subscription.plan_slug,
      status: subscription.status,
      is_admin_granted: subscription.is_admin_granted,
    } : null
  }

  /**
   * Check if the subscription is active
   * @returns {boolean}
   */
  const isActive = () => {
    return subscription?.status === 'active' || subscription?.status === 'authenticated'
  }

  /**
   * Get all features grouped by category
   * @returns {object} Features grouped by category
   */
  const getFeaturesByCategory = () => {
    const grouped = {}
    features.forEach((feature) => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = []
      }
      grouped[feature.category].push(feature)
    })
    return grouped
  }

  /**
   * Get only enabled features
   * @returns {array} Array of enabled features
   */
  const getEnabledFeatures = () => {
    return features.filter((f) => f.hasAccess)
  }

  /**
   * Get only disabled features
   * @returns {array} Array of disabled features
   */
  const getDisabledFeatures = () => {
    return features.filter((f) => !f.hasAccess)
  }

  return {
    // State
    loading,
    error,
    subscription,
    features,
    limits,
    currentPlan: getCurrentPlan(),

    // Helper functions
    hasFeature,
    getLimit,
    getLimitValue,
    hasLimit,
    getCurrentPlan,
    isActive,
    getFeaturesByCategory,
    getEnabledFeatures,
    getDisabledFeatures,
  }
}
