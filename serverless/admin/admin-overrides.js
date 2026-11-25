import { getAuthenticatedUser, getSupabaseAdmin, json, method } from '../_lib/payment.js'
import { checkIsSuperAdmin } from '../_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

/**
 * Admin API for business feature overrides
 *
 * GET /api/admin/overrides - List all overrides
 * GET /api/admin/overrides/:id - Get specific override
 * POST /api/admin/overrides - Create override
 * PUT /api/admin/overrides/:id - Update override
 * DELETE /api/admin/overrides/:id - Delete override
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
    // GET all overrides
    if (req.method === 'GET' && !id) {
      const { business_id, feature_id } = req.query

      let query = admin
        .from('business_feature_overrides')
        .select(`
          *,
          businesses:business_id (id, name, owner_id),
          features:feature_id (id, feature_key, name, category)
        `)
        .order('created_at', { ascending: false })

      if (business_id) query = query.eq('business_id', business_id)
      if (feature_id) query = query.eq('feature_id', feature_id)

      const { data, error } = await query

      if (error) throw error

      return json(res, 200, { overrides: data })
    }

    // GET specific override
    if (req.method === 'GET' && id) {
      const { data, error } = await admin
        .from('business_feature_overrides')
        .select(`
          *,
          businesses:business_id (id, name, owner_id),
          features:feature_id (id, feature_key, name, category)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Override not found' })

      return json(res, 200, { override: data })
    }

    // POST - Create override
    if (req.method === 'POST') {
      const { business_id, feature_id, is_enabled, reason, expires_at } = req.body

      if (!business_id || !feature_id) {
        return json(res, 400, { error: 'business_id and feature_id are required' })
      }
      if (typeof is_enabled !== 'boolean') {
        return json(res, 400, { error: 'is_enabled must be a boolean' })
      }
      if (typeof reason !== 'string' || !reason.trim()) {
        return json(res, 400, { error: 'An explanation is required for feature overrides' })
      }
      if (expires_at && !Number.isFinite(Date.parse(expires_at))) {
        return json(res, 400, { error: 'Invalid override expiry date' })
      }

      const { data, error } = await admin
        .from('business_feature_overrides')
        .upsert(
          {
            business_id,
            feature_id,
            is_enabled,
            reason: reason.trim(),
            expires_at: expires_at || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'business_id,feature_id' }
        )
        .select()
        .single()

      if (error) throw error

      return json(res, 201, { override: data })
    }

    // PUT - Update override
    if (req.method === 'PUT' && id) {
      const { is_enabled, reason, expires_at } = req.body

      if (is_enabled !== undefined && typeof is_enabled !== 'boolean') {
        return json(res, 400, { error: 'is_enabled must be a boolean' })
      }
      if (typeof reason !== 'string' || !reason.trim()) {
        return json(res, 400, { error: 'An explanation is required for feature overrides' })
      }
      if (expires_at && !Number.isFinite(Date.parse(expires_at))) {
        return json(res, 400, { error: 'Invalid override expiry date' })
      }

      const updateData = { updated_at: new Date().toISOString() }
      if (is_enabled !== undefined) updateData.is_enabled = is_enabled
      updateData.reason = reason.trim()
      if (expires_at !== undefined) updateData.expires_at = expires_at || null

      const { data, error } = await admin
        .from('business_feature_overrides')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Override not found' })

      return json(res, 200, { override: data })
    }

    // DELETE - Delete override
    if (req.method === 'DELETE' && id) {
      const { error } = await admin.from('business_feature_overrides').delete().eq('id', id)

      if (error) throw error

      return json(res, 200, { success: true })
    }

    return method(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    console.error('admin-overrides failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to manage override' })
  }
}
