import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method, normalizePlan, rateLimitRecentOrders } from '../serverless/_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const plan = normalizePlan(req.body?.plan_id)
    if (!plan) return json(res, 400, { error: 'Invalid plan' })

    const admin = getSupabaseAdmin()
    if (!(await rateLimitRecentOrders(admin, user.id))) {
      return json(res, 429, { error: 'Too many order requests. Please try again shortly.' })
    }

    const { keyId, client } = getRazorpay()
    const order = await client.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: `opulit_${plan.id}_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { plan_id: plan.id, user_id: user.id },
    })

    const { error } = await admin.from('razorpay_orders').insert({
      id: order.id,
      user_id: user.id,
      plan_id: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      status: order.status || 'created',
      receipt: order.receipt,
    })
    if (error) throw error

    return json(res, 200, { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId })
  } catch (error) {
    console.error('create-order failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { error: 'Could not create payment order' })
  }
}
