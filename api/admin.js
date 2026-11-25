import { json } from '../serverless/_lib/payment.js'
import adminFeatures from '../serverless/admin/admin-features.js'
import adminOverrides from '../serverless/admin/admin-overrides.js'
import adminPayments from '../serverless/admin/admin-payments.js'
import adminPlanFeatures from '../serverless/admin/admin-plan-features.js'
import adminPlans from '../serverless/admin/admin-plans.js'
import adminSubscriptions from '../serverless/admin/admin-subscriptions.js'

const handlers = new Map([
  ['features', adminFeatures],
  ['overrides', adminOverrides],
  ['payments', adminPayments],
  ['plan_features', adminPlanFeatures],
  ['plans', adminPlans],
  ['subscriptions', adminSubscriptions],
])

export default async function handler(req, res) {
  const resource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource
  const resourceHandler = handlers.get(resource)

  if (!resourceHandler) {
    return json(res, 404, { error: 'Unknown admin resource' })
  }

  return resourceHandler(req, res)
}
