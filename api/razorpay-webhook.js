import crypto from 'node:crypto'
import { getSupabaseAdmin, json, timingSafeHexEqual } from '../serverless/_lib/payment.js'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  if (typeof req.text === 'function') return req.text()
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8')
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (typeof req.body === 'string') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function unixToIso(value) {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  let admin
  let processingEventId
  try {
    const rawBody = await readRawBody(req)
    const signature = req.headers['x-razorpay-signature']
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) return json(res, 500, { error: 'Webhook secret is not configured' })
    if (typeof signature !== 'string') return json(res, 400, { error: 'Missing webhook signature' })

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
    if (!timingSafeHexEqual(signature, expected)) return json(res, 400, { error: 'Invalid webhook signature' })

    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return json(res, 400, { error: 'Invalid webhook payload' })
    }

    const paymentEntity = payload.payload?.payment?.entity
    const subscriptionEntity = payload.payload?.subscription?.entity
    const eventId = payload.event_id ||
      (paymentEntity?.id ? `${payload.event}:${paymentEntity.id}` :
        subscriptionEntity?.id ? `${payload.event}:${subscriptionEntity.id}:${subscriptionEntity.updated_at || payload.created_at || ''}` :
          `${payload.event}:${payload.created_at || crypto.randomUUID()}`)
    if (!payload.event || !eventId) return json(res, 400, { error: 'Invalid webhook event' })

    admin = getSupabaseAdmin()
    const { data: existingEvent, error: existingError } = await admin
      .from('webhook_events')
      .select('id, status, created_at')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existingError) throw existingError
    if (existingEvent?.status === 'processed') {
      return json(res, 200, { received: true, duplicate: true })
    }
    if (
      existingEvent?.status === 'processing' &&
      Date.now() - new Date(existingEvent.created_at).getTime() < 5 * 60 * 1000
    ) {
      return json(res, 503, { error: 'Webhook event is already being processed' })
    }

    processingEventId = eventId
    if (existingEvent) {
      const { error: retryError } = await admin
        .from('webhook_events')
        .update({ status: 'processing', payload, processed_at: null })
        .eq('event_id', eventId)
      if (retryError) throw retryError
    } else {
      const { error: eventError } = await admin.from('webhook_events').insert({
        event_id: eventId,
        event_name: payload.event,
        payload,
        status: 'processing',
      })
      if (eventError) throw eventError
    }

    const event = payload.event
    const payment = payload.payload?.payment?.entity
    const subscription = payload.payload?.subscription?.entity

    if (event === 'payment.captured' && payment) {
      const { data: order } = await admin
        .from('razorpay_orders')
        .select('user_id, plan_id')
        .eq('id', payment.order_id)
        .maybeSingle()
      if (order) {
        const { error: paymentUpsertError } = await admin.from('payments').upsert({
          user_id: order.user_id,
          plan_id: order.plan_id,
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          status: 'captured',
          method: payment.method || null,
        }, { onConflict: 'razorpay_payment_id' })
        if (paymentUpsertError) throw paymentUpsertError
        const { error: orderUpdateError } = await admin
          .from('razorpay_orders')
          .update({ status: 'paid', payment_id: payment.id })
          .eq('id', payment.order_id)
        if (orderUpdateError) throw orderUpdateError
      }
    }

    if (event === 'payment.failed' && payment) {
      if (payment.order_id) {
        const { error: orderUpdateError } = await admin
          .from('razorpay_orders')
          .update({ status: 'failed' })
          .eq('id', payment.order_id)
        if (orderUpdateError) throw orderUpdateError
      }

      if (payment.subscription_id) {
        const { data: sub, error: subError } = await admin
          .from('subscriptions')
          .select('id, user_id, plan_id')
          .eq('razorpay_subscription_id', payment.subscription_id)
          .maybeSingle()
        if (subError) throw subError
        if (sub) {
          const { error: failedPaymentError } = await admin.from('payments').upsert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            plan_id: sub.plan_id,
            razorpay_subscription_id: payment.subscription_id,
            razorpay_payment_id: payment.id,
            amount: Number(payment.amount || 0),
            currency: payment.currency,
            status: 'failed',
            method: payment.method || null,
          }, { onConflict: 'razorpay_payment_id' })
          if (failedPaymentError) throw failedPaymentError
        }
      }
    }

    if (event.startsWith('subscription.') && subscription) {
      const { data: existingSubscription } = await admin
        .from('subscriptions')
        .select('id, user_id, plan_id, business_id')
        .eq('razorpay_subscription_id', subscription.id)
        .maybeSingle()

      if (existingSubscription) {
        const statusMap = {
          'subscription.activated': 'active',
          'subscription.charged': 'active',
          'subscription.pending': 'pending',
          'subscription.halted': 'halted',
          'subscription.cancelled': 'cancelled',
          'subscription.completed': 'completed',
          'subscription.paused': 'paused',
        }
        const { error: subscriptionUpdateError } = await admin.from('subscriptions').update({
          status: statusMap[event] || subscription.status,
          current_start: unixToIso(subscription.current_start),
          current_end: unixToIso(subscription.current_end),
          ended_at: unixToIso(subscription.ended_at),
          paid_count: Number(subscription.paid_count || 0),
        }).eq('razorpay_subscription_id', subscription.id)
        if (subscriptionUpdateError) throw subscriptionUpdateError
      }

      if (event === 'subscription.charged' && payment) {
        const { data: sub } = await admin
          .from('subscriptions')
          .select('id, user_id, plan_id, business_id')
          .eq('razorpay_subscription_id', subscription.id)
          .maybeSingle()
        if (sub) {
          const { error: paymentUpsertError } = await admin.from('payments').upsert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            plan_id: sub.plan_id,
            razorpay_subscription_id: subscription.id,
            razorpay_payment_id: payment.id,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: 'captured',
            method: payment.method || null,
          }, { onConflict: 'razorpay_payment_id' })
          if (paymentUpsertError) throw paymentUpsertError
        }
      }
    }

    if (event === 'payment.refunded' || event === 'refund.processed') {
      const refundedPaymentId = payment?.id || payload.payload?.refund?.entity?.payment_id
      if (refundedPaymentId) {
        const { error: refundUpdateError } = await admin
          .from('payments')
          .update({ status: 'refunded' })
          .eq('razorpay_payment_id', refundedPaymentId)
        if (refundUpdateError) throw refundUpdateError
      }
    }

    const { error: processedError } = await admin
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('event_id', eventId)
    if (processedError) throw processedError
    return json(res, 200, { received: true })
  } catch (error) {
    if (admin && processingEventId) {
      const { error: eventUpdateError } = await admin
        .from('webhook_events')
        .update({ status: 'failed' })
        .eq('event_id', processingEventId)
      if (eventUpdateError) console.error('webhook retry state update failed', { code: eventUpdateError.code })
    }
    console.error('webhook failed', { code: error?.code })
    return json(res, 500, { error: 'Webhook processing failed' })
  }
}
