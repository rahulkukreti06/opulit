import { getRazorpay } from './payment.js'

/**
 * Check if a business has access to a specific feature
 */
export async function checkFeatureAccess(admin, businessId, featureKey, userId) {
  const { data, error } = await admin.rpc('check_business_feature_entitlement', {
    p_business_id: businessId,
    p_feature_key: featureKey,
    p_user_id: userId,
  })

  if (error) throw error

  return {
    hasAccess: data?.[0]?.has_access || false,
    limit: data?.[0]?.limit_value || {},
    source: data?.[0]?.source || 'unknown',
  }
}

/**
 * Get all limits for a business
 */
export async function getBusinessLimits(admin, businessId, userId) {
  const { data, error } = await admin.rpc('get_business_limits', {
    p_business_id: businessId,
    p_user_id: userId,
  })

  if (error) throw error

  return data || {}
}

/**
 * Get active subscription for a business
 */
export async function getBusinessSubscription(admin, businessId) {
  const { data, error } = await admin
    .from('subscriptions')
    .select(`
      *,
      plans:plan_id (
        id,
        name,
        slug,
        description,
        amount,
        currency,
        billing_interval
      )
    `)
    .eq('business_id', businessId)
    .in('status', ['active', 'authenticated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const activePaidSubscription = data &&
    data.plans?.slug !== 'free' &&
    (!data.current_end || new Date(data.current_end).getTime() > Date.now())

  if (activePaidSubscription) return data

  const recoveredSubscription = await recoverAuthorizedSubscription(admin, businessId)
  if (recoveredSubscription) return recoveredSubscription

  if (data?.current_end && new Date(data.current_end).getTime() <= Date.now()) {
    return getFreePlanSubscription(admin)
  }

  return data || getFreePlanSubscription(admin)
}

async function recoverAuthorizedSubscription(admin, businessId) {
  const { data: pendingSubscriptions, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .eq('payment_provider', 'razorpay')
    .eq('status', 'created')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  if (!pendingSubscriptions?.length) return null

  const { client } = getRazorpay()
  const { items } = await client.payments.all({ count: 100 })
  const payments = items || []

  for (const pending of pendingSubscriptions) {
    if (!pending.razorpay_subscription_id || !pending.razorpay_plan_id) continue

    const { items: invoices } = await client.invoices.all({
      subscription_id: pending.razorpay_subscription_id,
      count: 100,
    })
    const invoicePaymentIds = new Set(
      (invoices || []).map((invoice) => invoice.payment_id).filter(Boolean)
    )
    let payment = payments.find((item) =>
      (item.subscription_id === pending.razorpay_subscription_id || invoicePaymentIds.has(item.id)) &&
      ['authorized', 'captured'].includes(item.status)
    )
    if (!payment) {
      for (const paymentId of invoicePaymentIds) {
        const invoicePayment = await client.payments.fetch(paymentId)
        if (['authorized', 'captured'].includes(invoicePayment.status)) {
          payment = invoicePayment
          break
        }
      }
    }
    if (!payment) continue

    const [liveSubscription, razorpayPlan] = await Promise.all([
      client.subscriptions.fetch(pending.razorpay_subscription_id),
      client.plans.fetch(pending.razorpay_plan_id),
    ])
    if (
      liveSubscription.plan_id !== pending.razorpay_plan_id ||
      !['created', 'active', 'authenticated'].includes(liveSubscription.status) ||
      (payment.status === 'authorized' && !['active', 'authenticated'].includes(liveSubscription.status)) ||
      (liveSubscription.current_end && liveSubscription.current_end * 1000 <= Date.now())
    ) {
      continue
    }
    if (
      Number(payment.amount) !== Number(razorpayPlan.item?.amount) ||
      payment.currency !== razorpayPlan.item?.currency
    ) {
      throw new Error('Subscription payment does not match its Razorpay plan')
    }

    const { error: paymentError } = await admin.from('payments').upsert({
      user_id: pending.user_id,
      subscription_id: pending.id,
      plan_id: pending.plan_id,
      razorpay_subscription_id: pending.razorpay_subscription_id,
      razorpay_payment_id: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method || null,
    }, { onConflict: 'razorpay_payment_id' })
    if (paymentError) throw paymentError

    const { error: updateError } = await admin
      .from('subscriptions')
      .update({
        status: 'active',
        current_start: liveSubscription.current_start
          ? new Date(liveSubscription.current_start * 1000).toISOString()
          : null,
        current_end: liveSubscription.current_end
          ? new Date(liveSubscription.current_end * 1000).toISOString()
          : null,
      })
      .eq('id', pending.id)
    if (updateError) throw updateError

    const { error: previousSubscriptionsError } = await admin
      .from('subscriptions')
      .delete()
      .eq('business_id', businessId)
      .neq('id', pending.id)
    if (previousSubscriptionsError) throw previousSubscriptionsError

    const { data: recovered, error: recoveredError } = await admin
      .from('subscriptions')
      .select(`
        *,
        plans:plan_id (
          id,
          name,
          slug,
          description,
          amount,
          currency,
          billing_interval
        )
      `)
      .eq('id', pending.id)
      .single()
    if (recoveredError) throw recoveredError
    return recovered
  }

  return null
}

async function getFreePlanSubscription(admin) {
  const { data: plan, error } = await admin
    .from('plans')
    .select('id, name, slug, description, amount, currency, billing_interval')
    .eq('slug', 'free')
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!plan) throw new Error('Free plan is not configured')

  return {
    plan_id: plan.id,
    status: 'active',
    payment_provider: 'manual',
    is_admin_granted: false,
    current_start: null,
    current_end: null,
    plans: plan,
  }
}

/**
 * Check if user is admin
 */
export async function checkIsAdmin(admin, userId) {
  const { data, error } = await admin.rpc('is_admin', {
    p_user_id: userId,
  })

  if (error) throw error

  return data || false
}

/**
 * Check if user is super admin
 */
export async function checkIsSuperAdmin(admin, userId) {
  const { data, error } = await admin.rpc('is_super_admin', {
    p_user_id: userId,
  })

  if (error) throw error

  return data || false
}

/**
 * Verify business ownership
 */
export async function verifyBusinessOwnership(admin, userId, businessId) {
  const { data, error } = await admin
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) throw error

  return data !== null
}

/**
 * Get business features with access status
 */
export async function getBusinessFeatures(admin, businessId, userId) {
  const [{ data: features, error: featuresError }, { data: overrides, error: overridesError }] =
    await Promise.all([
      admin
        .from('features')
        .select('*')
        .eq('is_active', true)
        .order('category', 'name'),
      admin
        .from('business_feature_overrides')
        .select('feature_id, is_enabled, reason, expires_at')
        .eq('business_id', businessId),
    ])

  if (featuresError) throw featuresError
  if (overridesError) throw overridesError

  const activeOverrides = new Map(
    overrides
      .filter((override) => !override.expires_at || new Date(override.expires_at).getTime() > Date.now())
      .map((override) => [override.feature_id, override])
  )

  return Promise.all(features.map(async (feature) => {
    const entitlement = await checkFeatureAccess(admin, businessId, feature.feature_key, userId)
    const override = activeOverrides.get(feature.id)
    return {
      ...feature,
      hasAccess: entitlement.hasAccess,
      limit: entitlement.limit,
      source: entitlement.source,
      overridden: Boolean(override),
      overrideReason: override?.reason || null,
      overrideExpiresAt: override?.expires_at || null,
    }
  }))
}
