import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method } from './_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })
    const admin = getSupabaseAdmin()
    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'authenticated', 'pending', 'halted'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!subscription) return json(res, 404, { error: 'No active subscription found' })

    const { client } = getRazorpay()
    await client.subscriptions.cancel(subscription.razorpay_subscription_id, true)
    await admin
      .from('subscriptions')
      .update({ status: 'cancel_requested', updated_at: new Date().toISOString() })
      .eq('razorpay_subscription_id', subscription.razorpay_subscription_id)
    return json(res, 200, { success: true })
  } catch (error) {
    console.error('cancel-subscription failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { error: 'Could not cancel subscription' })
  }
}
