import crypto from 'node:crypto'
import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method, timingSafeHexEqual } from './_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } = req.body || {}
    if (typeof paymentId !== 'string' || typeof subscriptionId !== 'string' || typeof signature !== 'string') {
      return json(res, 400, { success: false, error: 'Missing subscription verification fields' })
    }

    const admin = getSupabaseAdmin()
    const { data: subscription, error } = await admin
      .from('subscriptions')
      .select('*')
      .eq('razorpay_subscription_id', subscriptionId)
      .maybeSingle()
    if (error) throw error
    if (!subscription || subscription.user_id !== user.id) {
      return json(res, 403, { success: false, error: 'Subscription does not belong to this account' })
    }

    const { keySecret, client } = getRazorpay()
    const expected = crypto.createHmac('sha256', keySecret).update(`${paymentId}|${subscriptionId}`).digest('hex')
    if (!timingSafeHexEqual(signature, expected)) {
      return json(res, 400, { success: false, error: 'Subscription signature mismatch' })
    }

    const [payment, liveSubscription] = await Promise.all([
      client.payments.fetch(paymentId),
      client.subscriptions.fetch(subscriptionId),
    ])
    if (payment.status !== 'captured' || payment.subscription_id !== subscriptionId) {
      return json(res, 409, { success: false, error: 'Subscription payment is not captured' })
    }
    if (!subscription.razorpay_plan_id || liveSubscription.plan_id !== subscription.razorpay_plan_id) {
      return json(res, 400, { success: false, error: 'Subscription plan mismatch' })
    }
    if (!['active', 'authenticated'].includes(liveSubscription.status)) {
      return json(res, 409, { success: false, error: 'Subscription is not in an active authorization state' })
    }

    const razorpayPlan = await client.plans.fetch(subscription.razorpay_plan_id)
    if (
      Number(payment.amount) !== Number(razorpayPlan.item?.amount) ||
      payment.currency !== razorpayPlan.item?.currency
    ) {
      return json(res, 400, { success: false, error: 'Subscription payment amount or currency mismatch' })
    }

    const { error: paymentError } = await admin.from('payments').upsert({
      user_id: user.id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: 'captured',
      method: payment.method || null,
    }, { onConflict: 'razorpay_payment_id' })
    if (paymentError) throw paymentError

    const { error: subscriptionUpdateError } = await admin.from('subscriptions').update({
      status: liveSubscription.status === 'authenticated' ? 'active' : liveSubscription.status,
      current_start: liveSubscription.current_start ? new Date(liveSubscription.current_start * 1000).toISOString() : null,
      current_end: liveSubscription.current_end ? new Date(liveSubscription.current_end * 1000).toISOString() : null,
    }).eq('razorpay_subscription_id', subscriptionId)
    if (subscriptionUpdateError) throw subscriptionUpdateError

    return json(res, 200, { success: true })
  } catch (error) {
    console.error('verify-subscription failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { success: false, error: 'Subscription verification failed' })
  }
}
