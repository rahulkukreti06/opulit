import { useCallback, useContext, useEffect, useSyncExternalStore } from 'react'
import { AuthContext } from '../context/authContext'

const CACHE_DURATION = 60_000
const ERROR_CACHE_DURATION = 5_000
const entitlementCache = new Map()
const entitlementRequests = new Map()
const entitlementListeners = new Map()
const emptySnapshot = () => null

function entitlementKey(userId, businessId) {
  return `${userId}:${businessId}`
}

function isFresh(entry) {
  if (!entry) return false
  const duration = entry.result.error ? ERROR_CACHE_DURATION : CACHE_DURATION
  return Date.now() - entry.updatedAt < duration
}

function subscribeToEntitlements(key, listener) {
  if (!key) return () => {}

  let keyListeners = entitlementListeners.get(key)
  if (!keyListeners) {
    keyListeners = new Set()
    entitlementListeners.set(key, keyListeners)
  }
  keyListeners.add(listener)

  return () => {
    keyListeners.delete(listener)
    if (!keyListeners.size) entitlementListeners.delete(key)
  }
}

function saveEntitlements(key, entry) {
  entitlementCache.set(key, entry)
  entitlementListeners.get(key)?.forEach((listener) => listener())
}

function fetchEntitlements(key, businessId, userId, accessToken) {
  const existingRequest = entitlementRequests.get(key)
  if (existingRequest) return existingRequest

  const request = fetch(`/api/entitlements?business_id=${businessId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch entitlements')
      return {
        businessId,
        userId,
        subscription: data.subscription,
        features: data.features || [],
        limits: data.limits || {},
        error: null,
      }
    })
    .catch((error) => {
      console.error('Failed to fetch entitlements:', error)
      return {
        businessId,
        userId,
        subscription: null,
        features: [],
        limits: {},
        error: error.message,
      }
    })
    .then((result) => {
      saveEntitlements(key, { result, updatedAt: Date.now() })
      return result
    })
    .finally(() => entitlementRequests.delete(key))

  entitlementRequests.set(key, request)
  return request
}

export function invalidateBusinessEntitlements(businessId, userId) {
  if (!businessId || !userId) return
  const key = entitlementKey(userId, businessId)
  entitlementCache.delete(key)
  entitlementListeners.get(key)?.forEach((listener) => listener())
}

/**
 * React hook for checking feature entitlements
 *
 * @param {string} businessId - The business UUID to check entitlements for
 * @returns {Object} Entitlement data and helper functions
 */
export function useEntitlements(businessId) {
  const { session } = useContext(AuthContext)
  const userId = session?.user?.id
  const accessToken = session?.access_token
  const key = userId && businessId ? entitlementKey(userId, businessId) : ''
  const subscribe = useCallback(
    (listener) => subscribeToEntitlements(key, listener),
    [key]
  )
  const getSnapshot = useCallback(
    () => key ? entitlementCache.get(key) || null : null,
    [key]
  )
  const entry = useSyncExternalStore(subscribe, getSnapshot, emptySnapshot)

  useEffect(() => {
    if (!key || !accessToken) return

    if (!isFresh(entry)) fetchEntitlements(key, businessId, userId, accessToken)
  }, [key, businessId, accessToken, userId, entry])

  const currentResult = entry?.result?.businessId === businessId && entry?.result?.userId === userId
    ? entry.result
    : null
  const loading = Boolean(businessId && accessToken && !currentResult)
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
