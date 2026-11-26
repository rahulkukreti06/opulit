# OPULIT Subscription & Feature Entitlement System - Implementation Summary

## Overview

A complete database-driven subscription management system has been implemented for OPULIT. This system allows you to control every user's plan, feature access, and limits directly from Supabase or the admin dashboard without changing React code.

---

## Architecture Decisions

### Business-Level Subscriptions
- **Decision**: Subscriptions are tied to `business_id` rather than `user_id`
- **Reason**: Users can own multiple businesses, and each business may need different plans
- **Implementation**: Added `business_id` column to `subscriptions` table

### Free Plan Assignment
- **Decision**: Free plan may be assigned for compatibility, but does not grant feature access
- **Implementation**: Database trigger `assign_free_plan_to_business()` on `businesses` table
  and paid-access enforcement in `paid_access_migration.sql`

### Legacy Data Migration
- **Decision**: Existing `businesses.features` array data is migrated to `business_feature_overrides`
- **Implementation**: Migration script in `subscription_system_migration.sql`

### Regional Pricing
- **Decision**: Pricing stored in database (`regional_prices` table) for secure backend verification
- **Implementation**: New table with plan_id, region_code, currency_code, amount

---

## SQL Migrations

### 1. Main Subscription System Migration
**File**: `supabase/subscription_system_migration.sql`

Ensure the existing `supabase/schema.sql` has been applied. Run
`supabase/payment_migration.sql` before the subscription migration, which extends
its `payment_plans`, `subscriptions`, and `payments` tables.

Creates/extends the following tables:

#### New Tables:
- `features` - Feature catalog (18 features defined)
- `admin_roles` - Admin permissions (super_admin, admin)
- `plan_features` - Plan-feature mapping with limits
- `business_feature_overrides` - Individual feature grants/revokes

#### Extended Tables:
- `plans` (renamed from `payment_plans`) - Added slug, description, billing_interval, is_active, regional_prices
- `subscriptions` - Added business_id, payment_provider, cancel_at_period_end, is_admin_granted
- `payments` - Added subscription_id, proper status enum constraint

#### Database Functions:
- `check_business_feature_entitlement(business_id, feature_key, user_id)` - Check if business has feature access
- `get_business_limits(business_id)` - Get all limits for a business
- `is_admin(user_id)` - Check if user is admin
- `is_super_admin(user_id)` - Check if user is super admin

#### Triggers:
- `assign_free_plan_to_business()` - Auto-assigns Free plan on business creation

#### Views:
- `active_subscriptions_view` - Join subscriptions with plan and business details

### 2. Regional Pricing Migration
**File**: `supabase/regional_pricing_migration.sql`

Creates:
- `regional_prices` table - Stores pricing per region/currency
- Functions:
  - `get_plan_pricing(plan_id, region_code)` - Get pricing for a region
  - `get_all_plan_pricing(plan_id)` - Get all regional pricing for a plan
  - `verify_payment_amount(plan_id, region_code, amount, currency)` - Verify payment amount
- `pricing_view` - View with plan and pricing details

### 3. Super Admin Assignment
**File**: `supabase/assign_super_admin.sql`

Contains a SQL Editor script that promotes the explicitly named existing account.
It does not create a callable role-management function.

### 4. Paid Access Enforcement
**File**: `supabase/paid_access_migration.sql`

Run this after the subscription system migration. Businesses without an active
paid plan (including those assigned the Free plan) cannot access features.
Authenticated users can still complete business onboarding and view pricing;
payment unlocks only the features included in their selected plan.

### 5. Keep Only the Current Subscription
**File**: `supabase/current_subscription_only_migration.sql`

Run this after the subscription system migration. It removes older subscription
records for each business and automatically deletes replaced records when a new
plan becomes active or an admin grants a plan. It also recovers created plans
that already have a captured or authorized payment, including payments in
stored webhook events. Payment records are retained.

---

## API Endpoints Created

### Entitlement Endpoints

#### `/api/entitlements`
- **Method**: GET
- **Query Params**: `business_id` (required), `feature` (optional)
- **Returns**: Subscription info, features with access status, limits
- **Usage**: `GET /api/entitlements?business_id=xxx&feature=inventory_management`

### Admin Endpoints (Super Admin Only)

#### `/api/admin-subscriptions`
- **GET**: List all subscriptions
- **GET ?id=xxx`: Get specific subscription
- **POST**: Create/update subscription (manual grant)
- **PUT ?id=xxx`: Update subscription
- **DELETE ?id=xxx**: Cancel subscription

#### `/api/admin-plans`
- **GET**: List all plans with features and regional pricing
- **GET ?id=xxx`: Get specific plan
- **POST**: Create plan
- **PUT ?id=xxx`: Update plan
- **DELETE ?id=xxx`: Delete plan

#### `/api/admin-features`
- **GET**: List all features
- **GET ?id=xxx`: Get specific feature
- **POST**: Create feature
- **PUT ?id=xxx`: Update feature
- **DELETE ?id=xxx**: Delete feature

#### `/api/admin-plan-features`
- **GET**: List plan-feature mappings
- **POST**: Create/update plan-feature
- **PUT ?id=xxx`: Update plan-feature
- **DELETE ?id=xxx`: Delete plan-feature

#### `/api/admin-overrides`
- **GET**: List business feature overrides
- **GET ?id=xxx`: Get specific override
- **POST**: Create override
- **PUT ?id=xxx`: Update override
- **DELETE ?id=xxx**: Delete override

#### `/api/admin-payments`
- **GET**: List payment history for the admin dashboard

### Updated Existing Endpoints

#### `/api/subscription-status`
- **Change**: Now requires `business_id` query parameter
- **Change**: Returns plan details with subscription info

#### `/api/cancel-subscription`
- **Change**: Now requires `business_id` query parameter
- **Change**: Supports both Razorpay and manual subscriptions

#### `/api/create-subscription`
- **Change**: Now requires `business_id` in request body
- **Change**: Supports regional pricing via `region_code`
- **Change**: Links subscription to business

#### `/api/verify-subscription`
- **Change**: Adds `subscription_id` to payments table

#### `/api/razorpay-webhook`
- **Change**: Updates subscriptions with business_id
- **Change**: Handles `subscription.completed` to fall back to Free plan
- **Change**: Adds `subscription_id` to payment records

---

## React Components and Route Gates

### Hooks

#### `src/hooks/useEntitlements.js`
React hook for checking feature entitlements.

**Usage**:
```javascript
const { hasFeature, getLimit, currentPlan, loading } = useEntitlements(businessId);

// Check feature access
if (hasFeature('inventory_management')) {
  // Show inventory
}

// Get limit
const maxProducts = getLimitValue('inventory_management', 'max_products');

// Get current plan
const plan = currentPlan(); // { id, name, slug, status, is_admin_granted }
```

**Returns**:
- `loading` - Boolean loading state
- `error` - Error message if any
- `subscription` - Current subscription object
- `features` - Array of all features with access status
- `limits` - Limits object
- `currentPlan` - Current plan info
- `hasFeature(featureKey)` - Check if feature is accessible
- `getLimit(featureKey)` - Get limit object for feature
- `getLimitValue(featureKey, limitKey)` - Get specific limit value
- `hasLimit(featureKey, limitKey)` - Check if limit exists
- `isActive()` - Check if subscription is active
- `getFeaturesByCategory()` - Get features grouped by category
- `getEnabledFeatures()` - Get only enabled features
- `getDisabledFeatures()` - Get only disabled features

### Admin Dashboard

#### `src/dashboard/admin/AdminSubscriptions.jsx`
Full admin dashboard at `/admin/subscriptions`.

**Features**:
- Tabbed interface for Subscriptions, Plans, Features, Overrides, Plan Features, and Payments
- Search functionality
- CRUD operations for all entities
- Modal forms for editing
- Admin access control (super_admin only)

**Route**: `/admin/subscriptions`

The workspace routes require an active paid subscription through
`RequireSubscription`. Core dashboard sections are also wrapped with
`RequireFeature`; invoice WhatsApp and email sharing checks the corresponding
communication entitlement.

---

## CSS Added

**File**: `css/dashboard.css`

Added styles for:
- `.admin-tabs` - Tab navigation
- `.admin-tab` - Individual tab
- `.admin-toolbar` - Toolbar with search and actions
- `.admin-search` - Search input
- `.admin-table-container` - Table wrapper
- `.admin-table` - Data table
- `.status-badge` - Status badges (active, cancelled, expired, pending)
- `.admin-action-button` - Action buttons
- `.modal-overlay` - Modal backdrop
- `.modal-content` - Modal container
- `.modal-header` - Modal header
- `.modal-body` - Modal body
- `.modal-footer` - Modal footer
- `.dashboard-alert` - Alert messages (error/success)

---

## Environment Variables Required

Add to your `.env` (already in `.env.example`):
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

---

## Deployment Steps

### 1. Run SQL Migrations

Run the migrations in Supabase SQL Editor in this order:

```sql
-- Ensure supabase/schema.sql has been applied first.

-- Step 1: Existing payment tables required by the subscription migration
-- Copy contents of supabase/payment_migration.sql and run

-- Step 2: Main subscription system
-- Copy contents of supabase/subscription_system_migration.sql and run

-- Step 3: Regional pricing
-- Copy contents of supabase/regional_pricing_migration.sql and run

-- Step 4: Require payment for feature entitlements
-- Copy contents of supabase/paid_access_migration.sql and run

-- Step 5: Keep only the current subscription
-- Copy contents of supabase/current_subscription_only_migration.sql and run

-- Step 6: Assign super admin (after migration)
-- Run the appropriate command from supabase/assign_super_admin.sql
```

### 2. Deploy API Changes

The API files are already in the `api/` directory. They will be deployed automatically by Vercel when you push to GitHub.

For local development, they work with the existing `server.js` setup.

### 3. Assign Super Admin to Your Account

After running migrations, assign yourself super_admin:

**Option A - By User ID**:
```sql
-- Find your user_id first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then assign role
INSERT INTO public.admin_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Assign by email**:
```sql
-- In supabase/assign_super_admin.sql, replace YOUR_EMAIL_HERE, then run the script.
```

### 4. Test the Admin Dashboard

1. Start your app: `npm run dev`
2. Log in with your super admin account
3. Navigate to: `http://localhost:5173/admin/subscriptions`
4. You should see the admin panel with full access

---

## Feature Limits Configuration

### Free Plan
Free-plan feature mappings remain for compatibility, but
`paid_access_migration.sql` denies feature access on the Free plan.

### Professional Plan Limits
- `inventory_management`: max_products: 500
- `customer_management`: max_customers: 250
- `employee_management`: max_employees: 3
- `membership_management`: max_memberships: 200

### Enterprise Plan Limits
- All features: No limits (unlimited)

Professional limits are configured in `plan_features`; Enterprise currently has
no numeric caps. Limits can be modified via:
1. Admin dashboard → Plans tab → Edit plan features
2. Direct SQL updates to `plan_features` table

---

## Entitlement and Enforcement

1. **An active paid subscription is required** before plan features or overrides apply.
2. Otherwise, access and limits come from the business's active subscription plan.
3. Planned or inactive features are not available.

The React route gate redirects unpaid users to pricing, while database RLS
policies and triggers enforce feature access to core business records. Admins
retain access. Invoice WhatsApp/email actions also check the corresponding
feature entitlement in the client.

---

## Testing Instructions

### Test Free Plan (Automatic)
1. Create a new account
2. Create a new business during onboarding
3. Check that the Free plan may be assigned for compatibility
4. Verify the app redirects to pricing and feature data is inaccessible until payment

### Test Professional Plan
1. Go to `/pricing`
2. Click "Sign Up with Professional"
3. Complete Razorpay payment
4. Verify Professional plan is activated
5. Verify Professional features are unlocked

### Test Enterprise Plan
1. Go to `/pricing`
2. Click "Sign Up with Enterprise"
3. Complete Razorpay payment
4. Verify Enterprise plan is activated
5. Verify all features are unlocked

### Test Admin Overrides
1. Log in as super admin
2. Go to `/admin/subscriptions`
3. Go to Overrides tab
4. Grant a specific feature to a Free user
5. Verify the user now has access to that feature

### Test Subscription Expiry
1. Set a subscription to expire soon (via admin dashboard)
2. Wait for `subscription.completed` webhook
3. Verify the app returns to pricing and paid feature access is removed

---

## Files Created/Modified

### Created Files:
- `supabase/subscription_system_migration.sql` - Main subscription system
- `supabase/current_subscription_only_migration.sql` - Removes older subscription records
- `supabase/paid_access_migration.sql` - Requires paid plan for feature access
- `supabase/regional_pricing_migration.sql` - Regional pricing
- `supabase/assign_super_admin.sql` - Super admin assignment
- `api/_lib/entitlement.js` - Entitlement helper functions
- `api/entitlements.js` - Entitlement API endpoint
- `api/admin-subscriptions.js` - Admin subscriptions API
- `api/admin-plans.js` - Admin plans API
- `api/admin-features.js` - Admin features API
- `api/admin-plan-features.js` - Admin plan-features API
- `api/admin-overrides.js` - Admin overrides API
- `src/hooks/useEntitlements.js` - React entitlement hook
- `src/components/RequireSubscription.jsx` - Redirects unpaid accounts to pricing
- `src/dashboard/admin/AdminSubscriptions.jsx` - Admin dashboard component

### Modified Files:
- `api/_lib/payment.js` - Added Free plan to PLANS constant
- `api/create-subscription.js` - Added business_id and regional pricing support
- `api/verify-subscription.js` - Added subscription_id to payments
- `api/razorpay-webhook.js` - Added business_id updates and expiry handling
- `api/subscription-status.js` - Added business_id parameter
- `api/cancel-subscription.js` - Added business_id parameter
- `src/App.jsx` - Added AdminSubscriptions route and import
- `src/dashboard/dashboard.jsx` - Routes completed business onboarding to pricing
- `src/pricing.jsx` - Returns to the workspace after verified payment
- `css/dashboard.css` - Added admin panel and modal styles

---

## Security Notes

### RLS Policies
- All new tables have RLS enabled
- `features` and `plan_features`: Public read access
- `admin_roles`: Only admins can read
- `business_feature_overrides`: Business owners can read their overrides
- Service role key required for admin operations

### Admin Protection
- Admin endpoints check `is_super_admin()` before allowing access
- Super admin status is stored in `admin_roles` table
- Cannot be set via client-side profile fields

### Payment Security
- Payment verification happens server-side
- Razorpay signatures are verified
- Regional pricing is validated in database
- Amount verification via `verify_payment_amount()` function

---

---

## Troubleshooting

### Admin panel shows "Access Denied"
- Verify you have a record in `admin_roles` table with role='super_admin'
- Check that your user_id matches the admin_roles.user_id

### Features not showing up
- Verify `subscription_system_migration.sql` ran successfully
- Check that `features` table has data
- Verify `plan_features` table has data for your plan

### Free plan not auto-assigned
- Check that the trigger `assign_free_plan_to_business` exists
- Verify the Free plan exists in `plans` table with slug='free'

### Razorpay payments failing
- Verify regional pricing exists for your region
- Confirm the stored regional price and Razorpay plan amount/currency match
- Ensure webhook is configured correctly

---

## Summary

Plans, feature mappings, and regional prices are database-driven. Every
subscription belongs to a business, and the admin UI includes subscription,
plan, feature, override, plan-feature, and payment views.

The frontend production build has passed. The SQL migrations, RLS behavior, and
Razorpay sandbox lifecycle still need verification in the target Supabase and
Razorpay environments before production use.
