import { getAuthenticatedUser, getSupabaseAdmin, json, method } from '../_lib/payment.js'
import { checkIsSuperAdmin } from '../_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

function validRegionalPrices(prices) {
  return Array.isArray(prices) && prices.every((price) =>
    typeof price?.region_code === 'string' &&
    /^[A-Z]{2}$/.test(price.region_code) &&
    typeof price.currency_code === 'string' &&
    /^[A-Z]{3}$/.test(price.currency_code) &&
    Number.isSafeInteger(price.amount) &&
    price.amount >= 0 &&
    (price.is_active === undefined || typeof price.is_active === 'boolean')
  )
}

/**
 * Admin API for plan management
 *
 * GET /api/admin/plans - List all plans
 * GET /api/admin/plans/:id - Get specific plan
 * POST /api/admin/plans - Create plan
 * PUT /api/admin/plans/:id - Update plan
 * DELETE /api/admin/plans/:id - Delete plan
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
    // GET all plans
    if (req.method === 'GET' && !id) {
      const { data, error } = await admin
        .from('plans')
        .select(`
          *,
          plan_features (
            feature_id,
            is_enabled,
            limits,
            features:feature_id (id, feature_key, name, category)
          ),
          regional_prices (region_code, currency_code, amount, display_name, is_active)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return json(res, 200, { plans: data })
    }

    // GET specific plan
    if (req.method === 'GET' && id) {
      const { data, error } = await admin
        .from('plans')
        .select(`
          *,
          plan_features (
            feature_id,
            is_enabled,
            limits,
            features:feature_id (id, feature_key, name, category)
          ),
          regional_prices (region_code, currency_code, amount, display_name, is_active)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Plan not found' })

      return json(res, 200, { plan: data })
    }

    // POST - Create plan
    if (req.method === 'POST') {
      const {
        id,
        name,
        slug,
        description,
        amount,
        currency,
        interval,
        billing_interval,
        is_active,
        regional_prices,
      } = req.body

      if (!id || !name || !slug) {
        return json(res, 400, { error: 'id, name, and slug are required' })
      }
      const planInterval = billing_interval || interval || 'monthly'
      if (!['monthly', 'yearly'].includes(planInterval)) {
        return json(res, 400, { error: 'billing_interval must be monthly or yearly' })
      }
      if (amount !== undefined && (!Number.isInteger(amount) || amount < 0)) {
        return json(res, 400, { error: 'amount must be a non-negative integer in the currency minor unit' })
      }
      if (currency && !/^[A-Z]{3}$/.test(currency)) {
        return json(res, 400, { error: 'currency must be a three-letter uppercase code' })
      }
      if (regional_prices !== undefined && !validRegionalPrices(regional_prices)) {
        return json(res, 400, { error: 'regional_prices contains an invalid entry' })
      }

      const { data, error } = await admin
        .from('plans')
        .insert({
          id,
          name,
          slug,
          description,
          amount: amount ?? 0,
          currency: currency || 'INR',
          interval: planInterval,
          billing_interval: planInterval,
          active: is_active !== false,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single()

      if (error) throw error

      // Add regional prices if provided
      if (regional_prices && Array.isArray(regional_prices)) {
        const { error: priceInsertError } = await admin.from('regional_prices').insert(
          regional_prices.map((price) => ({
            plan_id: id,
            region_code: price.region_code,
            currency_code: price.currency_code,
            amount: price.amount,
            display_name: price.display_name,
            is_active: price.is_active !== false,
          }))
        )
        if (priceInsertError) throw priceInsertError
      }

      return json(res, 201, { plan: data })
    }

    // PUT - Update plan
    if (req.method === 'PUT' && id) {
      const { name, description, amount, currency, interval, billing_interval, is_active, regional_prices } = req.body
      const planInterval = billing_interval || interval
      if (planInterval && !['monthly', 'yearly'].includes(planInterval)) {
        return json(res, 400, { error: 'billing_interval must be monthly or yearly' })
      }
      if (amount !== undefined && (!Number.isInteger(amount) || amount < 0)) {
        return json(res, 400, { error: 'amount must be a non-negative integer in the currency minor unit' })
      }
      if (currency && !/^[A-Z]{3}$/.test(currency)) {
        return json(res, 400, { error: 'currency must be a three-letter uppercase code' })
      }
      if (regional_prices !== undefined && !validRegionalPrices(regional_prices)) {
        return json(res, 400, { error: 'regional_prices contains an invalid entry' })
      }

      const updateData = { updated_at: new Date().toISOString() }
      if (name) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (amount !== undefined) updateData.amount = amount
      if (currency) updateData.currency = currency
      if (planInterval) {
        updateData.interval = planInterval
        updateData.billing_interval = planInterval
      }
      if (is_active !== undefined) updateData.is_active = is_active
      if (is_active !== undefined) updateData.active = is_active

      const { data, error } = await admin
        .from('plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return json(res, 404, { error: 'Plan not found' })

      if (regional_prices !== undefined) {
        const prices = regional_prices.map((price) => ({
          plan_id: id,
          region_code: price.region_code,
          currency_code: price.currency_code,
          amount: price.amount,
          display_name: price.display_name,
          is_active: price.is_active !== false,
        }))
        if (prices.length) {
          const { error: priceUpsertError } = await admin
            .from('regional_prices')
            .upsert(prices, { onConflict: 'plan_id,region_code' })
          if (priceUpsertError) throw priceUpsertError
        }
      }

      return json(res, 200, { plan: data })
    }

    // DELETE - Delete plan
    if (req.method === 'DELETE' && id) {
      const { error } = await admin.from('plans').delete().eq('id', id)

      if (error) throw error

      return json(res, 200, { success: true })
    }

    return method(res, ['GET', 'POST', 'PUT', 'DELETE'])
  } catch (error) {
    console.error('admin-plans failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to manage plan' })
  }
}
