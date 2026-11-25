import { getAuthenticatedUser, getSupabaseAdmin, json, method } from './_lib/payment.js'
import { checkIsSuperAdmin } from './_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

function validLimits(limits) {
  return limits !== null &&
    typeof limits === 'object' &&
    !Array.isArray(limits) &&
    Object.values(limits).every((value) => Number.isSafeInteger(value) && value >= 0)
}

/**
 * Admin API for plan-feature management
 *
 * GET /api/admin/plan-features - List all plan features
 * POST /api/admin/plan-features - Create/update plan feature
 * PUT /api/admin/plan-features/:id - Update plan feature
 * DELETE /api/admin/plan-features/:id - Delete plan feature
 */
export default async function handler(req, res) {
  const user = await getAuthenticatedUser(req)
  if (!user) return json(res, 401, { error: 'Authentication required' })

  const admin = getSupabaseAdmin()
  const isSuperAdmin = await checkIsSuperAdmin(admin, user.id)

  if (!isSuperAdmin) {
    return json(res, 403, { error: 'Super admin access required' })
  }

  const id = req.query.id

  try {
    // GET all plan features
    if (req.method === 'GET' && !id) {
      const { plan_id, feature_id } = req.query

      let query = admin
        .from('plan_features')
        .select(`
          *,
          plans:plan_id (id, name, slug),
          features:feature_id (id, feature_key, name, category)
        `)

      if (plan_id) query = query.eq('plan_id', plan_id)
      if (feature_id) query = query.eq('feature_id', feature_id)

      const { data, error } = await query

      if (error) throw error

      return json(res, 200, { plan_features: data })
    }

    // GET specific plan feature
    if (req.method === 'GET' && id) {
      const { data, error } = await admin
        .from('plan_features')
        .select(`
          *,
          plans:plan_id (id, name, slug),
          features:feature_id (id, feature_key, name, category)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Plan feature not found' })

      return json(res, 200, { plan_feature: data })
    }

    // POST - Create or update plan feature
    if (req.method === 'POST') {
      const { plan_id, feature_id, is_enabled, limits } = req.body

      if (!plan_id || !feature_id) {
        return json(res, 400, { error: 'plan_id and feature_id are required' })
      }
      if (is_enabled !== undefined && typeof is_enabled !== 'boolean') {
        return json(res, 400, { error: 'is_enabled must be a boolean' })
      }
      if (limits !== undefined && !validLimits(limits)) {
        return json(res, 400, { error: 'limits must be a JSON object of non-negative integer limits' })
      }

      const { data, error } = await admin
        .from('plan_features')
        .upsert(
          {
            plan_id,
            feature_id,
            is_enabled: is_enabled !== undefined ? is_enabled : true,
            limits: limits || {},
          },
          { onConflict: 'plan_id,feature_id' }
        )
        .select()
        .single()

      if (error) throw error

      return json(res, 201, { plan_feature: data })
    }

    // PUT - Update plan feature
    if (req.method === 'PUT' && id) {
      const { is_enabled, limits } = req.body

      const updateData = {}
      if (is_enabled !== undefined) updateData.is_enabled = is_enabled
      if (is_enabled !== undefined && typeof is_enabled !== 'boolean') {
        return json(res, 400, { error: 'is_enabled must be a boolean' })
      }
      if (limits !== undefined && !validLimits(limits)) {
        return json(res, 400, { error: 'limits must be a JSON object of non-negative integer limits' })
      }
      if (limits !== undefined) updateData.limits = limits

      const { data, error } = await admin
        .from('plan_features')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Plan feature not found' })

      return json(res, 200, { plan_feature: data })
    }

    // DELETE - Delete plan feature
    if (req.method === 'DELETE' && id) {
      const { error } = await admin.from('plan_features').delete().eq('id', id)

      if (error) throw error

      return json(res, 200, { success: true })
    }

    return method(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    console.error('admin-plan-features failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to manage plan feature' })
  }
}
