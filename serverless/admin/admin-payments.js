import { getAuthenticatedUser, getSupabaseAdmin, json, method } from '../_lib/payment.js'
import { checkIsSuperAdmin } from '../_lib/entitlement.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return method(res, ['GET'])

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return json(res, 401, { error: 'Authentication required' })

    const admin = getSupabaseAdmin()
    if (!(await checkIsSuperAdmin(admin, user.id))) {
      return json(res, 403, { error: 'Super admin access required' })
    }

    const { data: payments, error } = await admin
      .from('payments')
      .select('id, user_id, subscription_id, plan_id, amount, currency, status, method, razorpay_order_id, razorpay_payment_id, razorpay_subscription_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    const userIds = [...new Set((payments || []).map((payment) => payment.user_id))]
    const [{ data: profiles, error: profilesError }, { data: plans, error: plansError }] = await Promise.all([
      userIds.length
        ? admin.from('profiles').select('id, full_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      admin.from('plans').select('id, name'),
    ])

    if (profilesError) throw profilesError
    if (plansError) throw plansError

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const planById = new Map((plans || []).map((plan) => [plan.id, plan]))

    return json(res, 200, {
      payments: (payments || []).map((payment) => ({
        ...payment,
        profile: profileById.get(payment.user_id) || null,
        plan: planById.get(payment.plan_id) || null,
      })),
    })
  } catch (error) {
    console.error('admin-payments failed', { code: error?.code })
    return json(res, 500, { error: 'Failed to load payment history' })
  }
}
