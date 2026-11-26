import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'

const CACHE_DURATION = 60_000
const ERROR_CACHE_DURATION = 5_000
const cache = new Map()
const requests = new Map()
const listeners = new Map()
const emptySnapshot = () => null

function subscribe(userId, listener) {
  if (!userId) return () => {}

  let userListeners = listeners.get(userId)
  if (!userListeners) {
    userListeners = new Set()
    listeners.set(userId, userListeners)
  }
  userListeners.add(listener)

  return () => {
    userListeners.delete(listener)
    if (!userListeners.size) listeners.delete(userId)
  }
}

function saveLookup(userId, lookup) {
  cache.set(userId, { ...lookup, updatedAt: Date.now() })
  listeners.get(userId)?.forEach((listener) => listener())
}

function getSnapshot(userId) {
  return userId ? cache.get(userId) || null : null
}

function isFresh(lookup) {
  if (!lookup) return false
  const duration = lookup.error ? ERROR_CACHE_DURATION : CACHE_DURATION
  return Date.now() - lookup.updatedAt < duration
}

function loadBusinessLookup(userId) {
  const existingRequest = requests.get(userId)
  if (existingRequest) return existingRequest

  const request = Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin'])
      .limit(1),
  ])
    .then(([businessResult, roleResult]) => {
      if (businessResult.error) throw businessResult.error
      if (roleResult.error) throw roleResult.error
      return {
        businessId: businessResult.data?.id || '',
        isAdmin: Boolean(roleResult.data?.length),
        error: '',
      }
    })
    .catch((error) => ({
      businessId: '',
      isAdmin: false,
      error: error.message,
    }))
    .then((lookup) => {
      saveLookup(userId, lookup)
      return lookup
    })
    .finally(() => requests.delete(userId))

  requests.set(userId, request)
  return request
}

export function rememberBusinessId(userId, businessId) {
  if (!userId || !businessId) return
  saveLookup(userId, {
    businessId,
    isAdmin: cache.get(userId)?.isAdmin || false,
    error: '',
  })
}

export function useBusinessLookup(userId) {
  const subscribeToUser = useCallback(
    (listener) => subscribe(userId, listener),
    [userId]
  )
  const getUserSnapshot = useCallback(
    () => getSnapshot(userId),
    [userId]
  )
  const lookup = useSyncExternalStore(subscribeToUser, getUserSnapshot, emptySnapshot)

  useEffect(() => {
    if (userId && !isFresh(lookup)) loadBusinessLookup(userId)
  }, [userId, lookup])

  return {
    businessId: lookup?.businessId || '',
    isAdmin: Boolean(lookup?.isAdmin),
    loading: Boolean(userId && !lookup),
    error: lookup?.error || '',
  }
}
