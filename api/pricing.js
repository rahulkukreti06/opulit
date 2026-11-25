import { getSupabaseAdmin, json, method } from './_lib/payment.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return method(res, ['GET'])

  try {
    const admin = getSupabaseAdmin()
    const { data: plans, error: plansError } = await admin
      .from('plans')
      .select('id, name, slug, description, amount, currency, interval, billing_interval')
      .eq('active', true)
      .eq('is_active', true)
      .order('amount', { ascending: true })

    if (plansError) throw plansError
    const planIds = (plans || []).map((plan) => plan.id)
    if (!planIds.length) return json(res, 200, { plans: [] })

    const { data: prices, error: pricesError } = await admin
      .from('regional_prices')
      .select('plan_id, region_code, currency_code, amount, display_name')
      .in('plan_id', planIds)
      .eq('is_active', true)

    if (pricesError) throw pricesError

    return json(res, 200, {
      plans: plans.map((plan) => ({
        ...plan,
        regional_prices: (prices || []).filter((price) => price.plan_id === plan.id),
      })),
    })
  } catch (error) {
    console.error('pricing failed', { code: error?.code })
    return json(res, 500, { error: 'Could not load plan pricing' })
  }
}
