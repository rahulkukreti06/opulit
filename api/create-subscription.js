import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method, normalizePlan } from './_lib/payment.js'

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const plan = normalizePlan(req.body?.plan_id)
    if (!plan) return json(res, 400, { error: 'Invalid plan' })

    const admin = getSupabaseAdmin()
    const { data: planRow, error: planError } = await admin
      .from('payment_plans')
      .select('*')
      .eq('id', plan.id)
      .eq('active', true)
      .maybeSingle()
    if (planError) throw planError
    if (!planRow) return json(res, 500, { error: 'Payment plan is not configured' })

    const { keyId, client } = getRazorpay()
    let razorpayPlanId = planRow.razorpay_plan_id
    if (!razorpayPlanId) {
      const razorpayPlan = await client.plans.create({
        period: 'monthly',
        interval: 1,
        item: { name: `Opulit ${plan.name}`, amount: plan.amount, currency: plan.currency, description: `${plan.name} monthly subscription` },
        notes: { plan_id: plan.id },
      })
      razorpayPlanId = razorpayPlan.id
      const { error: updateError } = await admin
        .from('payment_plans')
        .update({ razorpay_plan_id: razorpayPlanId })
        .eq('id', plan.id)
      if (updateError) throw updateError
    }

    const subscription = await client.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { plan_id: plan.id, user_id: user.id },
    })

    const { error: insertError } = await admin.from('subscriptions').insert({
      user_id: user.id,
      plan_id: plan.id,
      razorpay_subscription_id: subscription.id,
      status: subscription.status || 'created',
      current_start: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
      current_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
    })
    if (insertError) throw insertError

    return json(res, 200, { subscription_id: subscription.id, key_id: keyId })
  } catch (error) {
    console.error('create-subscription failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { error: 'Could not create subscription' })
  }
}
