import { getAuthenticatedUser, getSupabaseAdmin, json, method } from './_lib/payment.js'
import { checkIsSuperAdmin } from './_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

async function attachProfiles(admin, subscriptions) {
  const userIds = [...new Set(subscriptions.map((subscription) => subscription.user_id).filter(Boolean))]
  if (!userIds.length) return subscriptions.map((subscription) => ({ ...subscription, profiles: null }))

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)
  if (error) throw error

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  return subscriptions.map((subscription) => ({
    ...subscription,
    profiles: profileById.get(subscription.user_id) || null,
  }))
}

/**
 * Admin API for subscription management
 *
 * GET /api/admin/subscriptions - List all subscriptions
 * GET /api/admin/subscriptions/:id - Get specific subscription
 * POST /api/admin/subscriptions - Create/update subscription
 * PUT /api/admin/subscriptions/:id - Update subscription
 * DELETE /api/admin/subscriptions/:id - Cancel subscription
 */
export default async function handler(req, res) {
  // Verify admin access
  const user = await getAuthenticatedUser(req)
  if (!user) return json(res, 401, { error: 'Authentication required' })

  const admin = getSupabaseAdmin()
  const isSuperAdmin = await checkIsSuperAdmin(admin, user.id)

  if (!isSuperAdmin) {
    return json(res, 403, { error: 'Super admin access required' })
  }

  const id = req.query.id

  try {
    // GET all subscriptions
    if (req.method === 'GET' && !id) {
      const { data, error } = await admin
        .from('subscriptions')
        .select(`
          *,
          plans:plan_id (id, name, slug, description),
          businesses:business_id (id, name, owner_id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return json(res, 200, { subscriptions: await attachProfiles(admin, data || []) })
    }

    // GET specific subscription
    if (req.method === 'GET' && id) {
      const { data, error } = await admin
        .from('subscriptions')
        .select(`
          *,
          plans:plan_id (id, name, slug, description),
          businesses:business_id (id, name, owner_id)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Subscription not found' })

      return json(res, 200, { subscription: (await attachProfiles(admin, [data]))[0] })
    }

    // POST - Create or update subscription (manual/admin grant)
    if (req.method === 'POST') {
      const { business_id, plan_id, status, current_end, reason } = req.body

      if (!business_id || !plan_id) {
        return json(res, 400, { error: 'business_id and plan_id are required' })
      }
      if (typeof reason !== 'string' || !reason.trim()) {
        return json(res, 400, { error: 'An explanation is required for manual subscription grants' })
      }
      if (status && !['active', 'pending', 'cancelled', 'expired'].includes(status)) {
        return json(res, 400, { error: 'Invalid subscription status' })
      }
      if (current_end && !Number.isFinite(Date.parse(current_end))) {
        return json(res, 400, { error: 'Invalid subscription expiry date' })
      }

      // Get business owner
      const { data: business, error: businessError } = await admin
        .from('businesses')
        .select('owner_id')
        .eq('id', business_id)
        .maybeSingle()

      if (businessError) throw businessError
      if (!business) return json(res, 404, { error: 'Business not found' })

      const { data: plan, error: planError } = await admin
        .from('plans')
        .select('id')
        .eq('id', plan_id)
        .maybeSingle()
      if (planError) throw planError
      if (!plan) return json(res, 404, { error: 'Plan not found' })

      const { data, error: grantError } = await admin.rpc('admin_grant_business_subscription', {
        p_business_id: business_id,
        p_plan_id: plan_id,
        p_status: status || 'active',
        p_current_end: current_end || null,
        p_reason: reason.trim(),
      })
      if (grantError) throw grantError
      const created = Array.isArray(data) ? data[0] : data
      if (!created) throw new Error('Subscription grant was not returned')

      return json(res, 201, { subscription: created })
    }

    // PUT - Update subscription
    if (req.method === 'PUT' && id) {
      const { plan_id, status, current_end, cancel_at_period_end, reason } = req.body

      if (status && !['active', 'pending', 'cancelled', 'expired'].includes(status)) {
        return json(res, 400, { error: 'Invalid subscription status' })
      }
      if (current_end && !Number.isFinite(Date.parse(current_end))) {
        return json(res, 400, { error: 'Invalid subscription expiry date' })
      }

      const { data: existing, error: existingError } = await admin
        .from('subscriptions')
        .select('id, plan_id, status, payment_provider')
        .eq('id', id)
        .maybeSingle()
      if (existingError) throw existingError
      if (!existing) return json(res, 404, { error: 'Subscription not found' })
      if (plan_id && plan_id !== existing.plan_id) {
        return json(res, 409, { error: 'Create a new subscription grant to preserve plan history' })
      }
      const changesManualGrant =
        (plan_id && plan_id !== existing.plan_id) ||
        (status && status !== existing.status) ||
        current_end !== undefined
      if (
        existing.payment_provider !== 'razorpay' &&
        changesManualGrant &&
        (typeof reason !== 'string' || !reason.trim())
      ) {
        return json(res, 400, { error: 'An explanation is required for manual subscription changes' })
      }

      const updateData = {
        updated_at: new Date().toISOString(),
      }

      if (plan_id) updateData.plan_id = plan_id
      if (status) updateData.status = status
      if (current_end !== undefined) updateData.current_end = current_end
      if (cancel_at_period_end !== undefined) updateData.cancel_at_period_end = cancel_at_period_end
      if (typeof reason === 'string') updateData.admin_reason = reason.trim()
      if (existing.payment_provider !== 'razorpay') {
        updateData.payment_provider = 'manual'
        updateData.is_admin_granted = true
      }

      const { data, error } = await admin
        .from('subscriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Subscription not found' })

      return json(res, 200, { subscription: data })
    }

    // DELETE - Cancel subscription
    if (req.method === 'DELETE' && id) {
      const { data, error } = await admin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Subscription not found' })

      return json(res, 200, { subscription: data })
    }

    return method(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    console.error('admin-subscriptions failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to manage subscription' })
  }
}
