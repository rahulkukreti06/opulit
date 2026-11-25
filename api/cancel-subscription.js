import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method } from './_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const businessId = req.query.business_id || req.body.business_id
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

    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('id, razorpay_subscription_id, payment_provider, is_admin_granted')
      .eq('business_id', businessId)
      .eq('payment_provider', 'razorpay')
      .in('status', ['active', 'authenticated', 'pending', 'halted'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!subscription) return json(res, 404, { error: 'No active subscription found' })
    if (subscription.is_admin_granted || subscription.payment_provider !== 'razorpay') {
      return json(res, 403, { error: 'Complimentary subscriptions must be changed by an administrator' })
    }

    if (!subscription.razorpay_subscription_id) {
      return json(res, 409, { error: 'Subscription has no Razorpay subscription ID' })
    }

    const { client } = getRazorpay()
    await client.subscriptions.cancel(subscription.razorpay_subscription_id, true)

    const { error: updateError } = await admin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
    if (updateError) throw updateError

    return json(res, 200, { success: true })
  } catch (error) {
    console.error('cancel-subscription failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { error: 'Could not cancel subscription' })
  }
}
