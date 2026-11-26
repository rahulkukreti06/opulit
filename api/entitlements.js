import { getAuthenticatedUser, getSupabaseAdmin, json, method } from '../serverless/_lib/payment.js'
import {
  checkFeatureAccess,
  getBusinessLimits,
  getBusinessSubscription,
  checkIsAdmin,
  checkIsSuperAdmin,
  verifyBusinessOwnership,
  getBusinessFeatures,
} from '../serverless/_lib/entitlement.js'

export const config = { api: { bodyParser: true } }

/**
 * GET /api/entitlements
 * Get entitlements for a business
 *
 * Query params:
 * - business_id: required - Business UUID
 * - feature: optional - Specific feature key to check
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return method(res, ['GET'])

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const businessId = req.query.business_id
    if (!businessId) return json(res, 400, { error: 'business_id is required' })

    const admin = getSupabaseAdmin()

    // Verify business ownership
    const isOwner = await verifyBusinessOwnership(admin, user.id, businessId)
    if (!isOwner) {
      // Check if user is admin/super admin
      const isAdmin = await checkIsAdmin(admin, user.id)
      const isSuperAdmin = await checkIsSuperAdmin(admin, user.id)

      if (!isAdmin && !isSuperAdmin) {
        return json(res, 403, { error: 'You do not have access to this business' })
      }
    }

    // Reconcile captured payments before reading feature entitlements.
    const subscription = await getBusinessSubscription(admin, businessId)

    // Check for specific feature
    if (req.query.feature) {
      const access = await checkFeatureAccess(admin, businessId, req.query.feature, user.id)
      return json(res, 200, {
        business_id: businessId,
        feature: req.query.feature,
        ...access,
      })
    }

    // Get all features with access status
    const features = await getBusinessFeatures(admin, businessId, user.id)

    // Get limits
    const limits = await getBusinessLimits(admin, businessId, user.id)

    return json(res, 200, {
      business_id: businessId,
      subscription: subscription
        ? {
            id: subscription.id,
            plan_id: subscription.plan_id,
            plan_name: subscription.plans?.name,
            plan_slug: subscription.plans?.slug,
            status: subscription.status,
            current_start: subscription.current_start,
            current_end: subscription.current_end,
            is_admin_granted: subscription.is_admin_granted,
          }
        : null,
      features,
      limits,
    })
  } catch (error) {
    console.error('entitlements failed', { code: error?.code, message: error?.message })
    return json(res, 500, { error: 'Failed to fetch entitlements' })
  }
}
