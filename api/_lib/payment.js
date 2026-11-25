import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'

export const PLANS = {
  free: { id: 'free', name: 'Free', amount: 0, currency: 'INR', interval: 'monthly' },
  professional: { id: 'professional', name: 'Professional', amount: 39900, currency: 'INR', interval: 'monthly' },
  enterprise: { id: 'enterprise', name: 'Enterprise', amount: 79900, currency: 'INR', interval: 'monthly' },
}

export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).send(JSON.stringify(body))
}

export function method(res, allowed) {
  res.setHeader('Allow', allowed.join(', '))
  return json(res, 405, { error: 'Method not allowed' })
}

export function getBearerToken(req) {
  const header = req.headers.authorization
  if (typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] || null
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase server configuration is missing')
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req)
  if (!token) return null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Supabase server configuration is missing')
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.getUser(token)
  return error ? null : data.user
}

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay credentials are not configured')
  return { keyId, keySecret, client: new Razorpay({ key_id: keyId, key_secret: keySecret }) }
}

export function timingSafeHexEqual(actual, expected) {
  if (typeof actual !== 'string' || !/^[a-f0-9]+$/i.test(actual)) return false
  const actualBuffer = Buffer.from(actual, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function rateLimitRecentOrders(admin, userId) {
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await admin
    .from('razorpay_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', cutoff)
  if (error) throw error
  return (count || 0) < 10
}

export function normalizePlan(value) {
  if (typeof value !== 'string') return null
  return PLANS[value.trim().toLowerCase()] || null
}
