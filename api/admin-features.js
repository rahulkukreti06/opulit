import { getAuthenticatedUser, getSupabaseAdmin, json, method } from './_lib/payment.js'
import { checkIsSuperAdmin } from './_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

/**
 * Admin API for feature management
 *
 * GET /api/admin/features - List all features
 * GET /api/admin/features/:id - Get specific feature
 * POST /api/admin/features - Create feature
 * PUT /api/admin/features/:id - Update feature
 * DELETE /api/admin/features/:id - Delete feature
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
    // GET all features
    if (req.method === 'GET' && !id) {
      const { data, error } = await admin
        .from('features')
        .select('*')
        .order('category', 'name')

      if (error) throw error

      return json(res, 200, { features: data })
    }

    // GET specific feature
    if (req.method === 'GET' && id) {
      const { data, error } = await admin
        .from('features')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Feature not found' })

      return json(res, 200, { feature: data })
    }

    // POST - Create feature
    if (req.method === 'POST') {
      const { feature_key, name, description, category, is_active, availability } = req.body

      if (!feature_key || !name) {
        return json(res, 400, { error: 'feature_key and name are required' })
      }
      if (availability && !['available', 'planned'].includes(availability)) {
        return json(res, 400, { error: 'availability must be available or planned' })
      }

      const { data, error } = await admin
        .from('features')
        .insert({
          feature_key,
          name,
          description,
          category: category || 'general',
          is_active: availability === 'planned' ? false : is_active !== undefined ? is_active : true,
          availability: availability || 'available',
        })
        .select()
        .single()

      if (error) throw error

      return json(res, 201, { feature: data })
    }

    // PUT - Update feature
    if (req.method === 'PUT' && id) {
      const { name, description, category, is_active, availability } = req.body
      if (availability && !['available', 'planned'].includes(availability)) {
        return json(res, 400, { error: 'availability must be available or planned' })
      }

      const updateData = { updated_at: new Date().toISOString() }
      if (name) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (category) updateData.category = category
      if (availability !== undefined) {
        updateData.availability = availability
        if (availability === 'planned') updateData.is_active = false
      }
      if (is_active !== undefined && availability !== 'planned') updateData.is_active = is_active

      const { data, error } = await admin
        .from('features')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Feature not found' })

      return json(res, 200, { feature: data })
    }

    // DELETE - Delete feature
    if (req.method === 'DELETE' && id) {
      const { error } = await admin.from('features').delete().eq('id', id)

      if (error) throw error

      return json(res, 200, { success: true })
    }

    return method(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    console.error('admin-features failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to manage feature' })
  }
}
