import { getAuthenticatedUser, getSupabaseAdmin, json, method } from './_lib/payment.js'
import { getBusinessSubscription } from './_lib/entitlement.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return method(res, ['GET'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const businessId = req.query.business_id
    if (!businessId) return json(res, 400, { error: 'business_id is required' })

    const admin = getSupabaseAdmin()

    // Verify business ownership
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .maybeSingle()

    if (businessError) throw businessError
    if (!business || business.owner_id !== user.id) {
      return json(res, 403, { error: 'You do not have access to this business' })
    }

    const subscription = await getBusinessSubscription(admin, businessId)
    return json(res, 200, { subscription })
  } catch (error) {
    console.error('subscription-status failed', { code: error?.code })
    return json(res, 500, { error: 'Could not load subscription status' })
  }
}
