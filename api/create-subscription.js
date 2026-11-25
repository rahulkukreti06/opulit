import { getAuthenticatedUser, getRazorpay, getSupabaseAdmin, json, method } from '../serverless/_lib/payment.js'

export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return method(res, ['POST'])
  try {
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
      return json(res, 503, { error: 'Server configuration missing: SUPABASE_URL' })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 503, { error: 'Server configuration missing: SUPABASE_SERVICE_ROLE_KEY' })
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return json(res, 503, { error: 'Server configuration missing: Razorpay credentials' })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const businessId = req.body?.business_id
    if (!businessId) return json(res, 400, { error: 'business_id is required' })

    const planId = typeof req.body?.plan_id === 'string'
      ? req.body.plan_id.trim().toLowerCase()
      : ''
    if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(planId)) {
      return json(res, 400, { error: 'Invalid plan' })
    }
    if (planId === 'free') return json(res, 400, { error: 'Free plans do not require checkout' })

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

    // Get plan with regional pricing
    const regionCode = typeof req.body?.region_code === 'string'
      ? req.body.region_code.toUpperCase()
      : 'IN'
    const { data: planRow, error: planError } = await admin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle()

    if (planError) {
      if (planError.code === 'PGRST205') {
        return json(res, 503, { error: 'Supabase migration missing: run subscription_system_migration.sql' })
      }
      throw planError
    }
    if (!planRow) return json(res, 500, { error: 'Payment plan is not configured' })

    // Get regional pricing
    let { data: regionalPrice, error: priceError } = await admin
      .from('regional_prices')
      .select('*')
      .eq('plan_id', planId)
      .eq('region_code', regionCode)
      .eq('is_active', true)
      .maybeSingle()

    if (priceError) throw priceError

    if (!regionalPrice && regionCode !== 'IN') {
      const defaultPrice = await admin
        .from('regional_prices')
        .select('*')
        .eq('plan_id', planId)
        .eq('region_code', 'IN')
        .eq('is_active', true)
        .maybeSingle()
      if (defaultPrice.error) throw defaultPrice.error
      regionalPrice = defaultPrice.data
    }

    const amount = regionalPrice?.amount ?? planRow.amount
    const currency = regionalPrice?.currency_code || planRow.currency
    if (!Number.isInteger(amount) || amount <= 0) {
      return json(res, 503, { error: 'Plan pricing is not configured' })
    }

    const { keyId, client } = getRazorpay()
    const billingInterval = planRow.billing_interval || planRow.interval || 'monthly'
    let razorpayPlanId = regionalPrice?.razorpay_plan_id || planRow.razorpay_plan_id

    if (razorpayPlanId) {
      const currentRazorpayPlan = await client.plans.fetch(razorpayPlanId)
      if (
        Number(currentRazorpayPlan.item?.amount) !== Number(amount) ||
        currentRazorpayPlan.item?.currency !== currency ||
        currentRazorpayPlan.period !== (billingInterval === 'yearly' ? 'yearly' : 'monthly')
      ) {
        razorpayPlanId = null
      }
    }

    if (!razorpayPlanId) {
      const razorpayPlan = await client.plans.create({
        period: billingInterval === 'yearly' ? 'yearly' : 'monthly',
        interval: 1,
        item: {
            name: `Opulit ${planRow.name}`,
          amount: amount,
          currency: currency,
            description: `${planRow.name} ${billingInterval} subscription`,
        },
        notes: { plan_id: planId, region_code: regionalPrice?.region_code || 'IN' },
      })
      razorpayPlanId = razorpayPlan.id
      const { error: updateError } = regionalPrice
        ? await admin
          .from('regional_prices')
          .update({ razorpay_plan_id: razorpayPlanId })
          .eq('id', regionalPrice.id)
        : await admin
          .from('plans')
          .update({ razorpay_plan_id: razorpayPlanId })
          .eq('id', planId)
      if (updateError) throw updateError
    }

    const subscription = await client.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: { plan_id: planId, user_id: user.id, business_id: businessId, region_code: regionCode },
    })

    const { error: insertError } = await admin.from('subscriptions').insert({
      user_id: user.id,
      business_id: businessId,
      plan_id: planId,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: razorpayPlanId,
      status: subscription.status || 'created',
      payment_provider: 'razorpay',
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
