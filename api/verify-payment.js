import crypto from 'node:crypto'
import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method, timingSafeHexEqual } from '../serverless/_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body || {}
    if (typeof paymentId !== 'string' || typeof orderId !== 'string' || typeof signature !== 'string') {
      return json(res, 400, { success: false, error: 'Missing payment verification fields' })
    }

    const admin = getSupabaseAdmin()
    const { data: order, error: orderError } = await admin
      .from('razorpay_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order || order.user_id !== user.id) {
      return json(res, 403, { success: false, error: 'Payment order does not belong to this account' })
    }

    const { keySecret, client } = getRazorpay()
    const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
    if (!timingSafeHexEqual(signature, expected)) {
      return json(res, 400, { success: false, error: 'Payment signature mismatch' })
    }

    let payment
    try {
      payment = await client.payments.fetch(paymentId)
      if (payment.status === 'authorized') {
        await client.payments.capture(paymentId, order.amount, order.currency)
        payment = await client.payments.fetch(paymentId)
      }
    } catch {
      return json(res, 502, { success: false, error: 'Could not verify payment with Razorpay' })
    }

    if (payment.status !== 'captured') {
      return json(res, 409, { success: false, error: 'Payment has not been captured' })
    }
    if (payment.order_id !== orderId) return json(res, 400, { success: false, error: 'Payment order mismatch' })
    if (Number(payment.amount) !== Number(order.amount) || payment.currency !== order.currency) {
      return json(res, 400, { success: false, error: 'Payment amount or currency mismatch' })
    }

    const { data: existing } = await admin.from('payments').select('id').eq('razorpay_payment_id', paymentId).maybeSingle()
    if (existing) return json(res, 200, { success: true, already_processed: true })

    const { error: paymentError } = await admin.from('payments').insert({
      user_id: user.id,
      plan_id: order.plan_id,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: 'captured',
      method: payment.method || null,
    })
    if (paymentError) throw paymentError

    await admin.from('razorpay_orders').update({ status: 'paid', payment_id: paymentId }).eq('id', orderId)

    return json(res, 200, { success: true, already_processed: false })
  } catch (error) {
    console.error('verify-payment failed', { code: error?.code, statusCode: error?.statusCode })
    return json(res, 500, { success: false, error: 'Payment verification failed' })
  }
}
