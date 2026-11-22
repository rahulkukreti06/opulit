import { getAuthenticatedUser, getSupabaseAdmin, json, method } from './_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return method(res, ['GET'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('subscriptions')
      .select('id, plan_id, razorpay_subscription_id, status, current_start, current_end, ended_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return json(res, 200, { subscription: data?.[0] || null })
  } catch (error) {
    console.error('subscription-status failed', { code: error?.code })
    return json(res, 500, { error: 'Could not load subscription status' })
  }
}
