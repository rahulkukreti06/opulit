-- ============================================
-- OPULIT SUBSCRIPTION & FEATURE ENTITLEMENT SYSTEM
-- Migration: Subscription System v1.0
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- STEP 1: Create new core tables
-- ============================================

-- Table: features
-- Stores all available OPULIT features
create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  name text not null,
  description text,
  category text not null default 'general',
  is_active boolean not null default true,
  availability text not null default 'available'
    check (availability in ('available', 'planned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.features
  add column if not exists availability text not null default 'available'
    check (availability in ('available', 'planned'));

-- Table: admin_roles
-- Stores administrative permissions
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ============================================
-- STEP 2: Extend existing payment_plans → plans
-- ============================================

-- Keep the existing plan rows and foreign keys while exposing them as plans.
do $$
begin
  if to_regclass('public.payment_plans') is not null
    and to_regclass('public.plans') is null then
    alter table public.payment_plans rename to plans;
  end if;
end $$;

-- Add new columns to plans
alter table public.plans
  add column if not exists slug text unique,
  add column if not exists description text,
  add column if not exists billing_interval text not null default 'monthly',
  add column if not exists is_active boolean not null default true;

alter table public.plans drop constraint if exists payment_plans_amount_check;
alter table public.plans drop constraint if exists plans_amount_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'plans_amount_nonnegative_check'
      and conrelid = 'public.plans'::regclass
  ) then
    alter table public.plans
      add constraint plans_amount_nonnegative_check check (amount >= 0);
  end if;
end $$;

-- Update existing plans with slugs and descriptions
update public.plans
set
  slug = coalesce(slug, lower(id)),
  description = case
    when id = 'professional' then 'Core features for growing businesses'
    when id = 'enterprise' then 'Advanced features for scaling teams'
    else 'Default plan'
  end,
  billing_interval = case
    when interval in ('monthly', 'yearly') then interval
    else billing_interval
  end,
  is_active = active
where slug is null
  or billing_interval is distinct from interval
  or is_active is distinct from active;

create or replace function public.reset_razorpay_plan_after_plan_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.amount is distinct from old.amount
    or new.currency is distinct from old.currency
    or new.interval is distinct from old.interval
    or new.billing_interval is distinct from old.billing_interval then
    new.razorpay_plan_id := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists plans_reset_razorpay_plan on public.plans;
create trigger plans_reset_razorpay_plan
  before update on public.plans
  for each row execute function public.reset_razorpay_plan_after_plan_change();

-- Add Free plan
insert into public.plans (id, name, slug, description, amount, currency, interval, active, is_active)
values
  ('free', 'Free', 'free', 'Essential features to get started', 0, 'INR', 'monthly', true, true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  is_active = true,
  active = true;

-- ============================================
-- STEP 3: Create plan_features table
-- ============================================

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  is_enabled boolean not null default false,
  limits jsonb default '{}',
  created_at timestamptz not null default now(),
  unique (plan_id, feature_id)
);

-- ============================================
-- STEP 4: Extend subscriptions table for business-level
-- ============================================

-- Add business_id to subscriptions
alter table public.subscriptions
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

-- Add new columns
alter table public.subscriptions
  add column if not exists razorpay_plan_id text,
  add column if not exists payment_provider text not null default 'razorpay',
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists is_admin_granted boolean not null default false,
  add column if not exists admin_reason text;

alter table public.subscriptions
  alter column razorpay_subscription_id drop not null;

-- Create index for business lookups
create index if not exists subscriptions_business_idx on public.subscriptions(business_id);

-- ============================================
-- STEP 5: Extend payments table
-- ============================================

-- Add proper subscription relationship
alter table public.payments
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

-- Keep the existing provider status values; new states are handled by the APIs.

-- ============================================
-- STEP 6: Create business_feature_overrides table
-- ============================================

create table if not exists public.business_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  is_enabled boolean not null,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, feature_id)
);

-- Index for quick lookups
create index if not exists business_feature_overrides_business_idx
  on public.business_feature_overrides(business_id);
create index if not exists business_feature_overrides_feature_idx
  on public.business_feature_overrides(feature_id);

-- ============================================
-- STEP 7: Enable RLS on new tables
-- ============================================

alter table public.plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;
alter table public.admin_roles enable row level security;
alter table public.business_feature_overrides enable row level security;

-- ============================================
-- STEP 8: Create RLS policies
-- ============================================

drop policy if exists "Customers can read active plans" on public.plans;
create policy "Customers can read active plans"
  on public.plans for select
  using (active = true and is_active = true);

-- features: Everyone can read active features
drop policy if exists "Anyone can read active features" on public.features;
create policy "Anyone can read active features"
  on public.features for select
  using (is_active = true);

-- plan_features: Everyone can read
drop policy if exists "Anyone can read plan features" on public.plan_features;
create policy "Anyone can read plan features"
  on public.plan_features for select
  using (true);

-- Users can see their own role, but only server-side admin APIs can change roles.
drop policy if exists "Only admins can read admin roles" on public.admin_roles;
drop policy if exists "Users can read their own admin role" on public.admin_roles;
create policy "Users can read their own admin role"
  on public.admin_roles for select
  using (user_id = auth.uid());

-- business_feature_overrides: Business owners can read their overrides
drop policy if exists "Business owners can read their feature overrides" on public.business_feature_overrides;
create policy "Business owners can read their feature overrides"
  on public.business_feature_overrides for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = business_feature_overrides.business_id
        and businesses.owner_id = auth.uid()
    )
  );

-- ============================================
-- STEP 9: Insert initial features
-- ============================================

insert into public.features (feature_key, name, description, category) values
  -- Core Features
  ('inventory_management', 'Inventory Management', 'Track products, quantities, and stock levels', 'core'),
  ('customer_management', 'Customer Management', 'Manage customer profiles and purchase history', 'core'),
  ('employee_management', 'Employee Management', 'Track staff details, salaries, and roles', 'core'),
  ('membership_management', 'Membership Management', 'Track membership plans and renewals', 'core'),
  ('billing_invoicing', 'Billing and Invoicing', 'Create and manage invoices', 'core'),

  -- Communication Features
  ('whatsapp_billing', 'WhatsApp Billing', 'Send bills via WhatsApp', 'communication'),
  ('email_billing', 'Email Billing', 'Send bills via email', 'communication'),

  -- Alert Features
  ('smart_alerts', 'Smart Alerts', 'General smart notifications', 'alerts'),
  ('low_stock_alerts', 'Low Stock Alerts', 'Alerts when products go below minimum quantity', 'alerts'),
  ('expiry_reminders', 'Expiry Reminders', 'Reminders for expiring memberships', 'alerts'),
  ('payment_reminders', 'Payment Reminders', 'Reminders for pending payments', 'alerts'),

  -- Advanced Features
  ('advanced_reports', 'Advanced Reports', 'Detailed business analytics and reports', 'advanced'),
  ('advanced_analytics', 'Advanced Analytics', 'Advanced data analytics and insights', 'advanced'),
  ('customer_purchase_history', 'Customer Purchase History', 'Track customer purchase patterns', 'advanced'),
  ('loyalty_discounts', 'Loyalty and Discounts', 'Customer loyalty programs and discounts', 'advanced'),

  -- Enterprise Features
  ('multi_location', 'Multi-location Access', 'Manage multiple business locations', 'enterprise'),
  ('custom_workflows', 'Custom Workflows', 'Customize business workflows', 'enterprise'),
  ('priority_support', 'Priority Support', 'Priority customer support', 'enterprise'),
  ('api_access', 'API Access', 'Programmatic API access', 'enterprise'),
  ('white_label', 'White Label', 'Custom branding options', 'enterprise'),
  ('sso', 'Single Sign-On', 'SSO integration for team access', 'enterprise')
on conflict (feature_key) do nothing;

update public.features
set availability = 'planned', is_active = false
where feature_key in (
  'email_billing',
  'advanced_reports',
  'advanced_analytics',
  'loyalty_discounts',
  'multi_location',
  'custom_workflows',
  'priority_support',
  'api_access',
  'white_label',
  'sso'
);

-- ============================================
-- STEP 10: Configure plan-feature mappings with limits
-- ============================================

-- Free plan features
insert into public.plan_features (plan_id, feature_id, is_enabled, limits)
select
  'free',
  f.id,
  true,
  '{}'::jsonb
from public.features f
where f.feature_key in (
  'inventory_management',
  'customer_management',
  'employee_management',
  'membership_management',
  'billing_invoicing',
  'whatsapp_billing',
  'smart_alerts',
  'low_stock_alerts',
  'expiry_reminders',
  'payment_reminders',
  'customer_purchase_history'
)
on conflict (plan_id, feature_id) do nothing;

-- Professional plan features
insert into public.plan_features (plan_id, feature_id, is_enabled, limits)
select
  'professional',
  f.id,
  true,
  case f.feature_key
    when 'inventory_management' then '{"max_products": 500}'::jsonb
    when 'customer_management' then '{"max_customers": 250}'::jsonb
    when 'employee_management' then '{"max_employees": 3}'::jsonb
    when 'membership_management' then '{"max_memberships": 200}'::jsonb
    else '{}'::jsonb
  end
from public.features f
where f.feature_key in (
  'inventory_management',
  'customer_management',
  'employee_management',
  'membership_management',
  'billing_invoicing',
  'whatsapp_billing',
  'email_billing',
  'smart_alerts',
  'low_stock_alerts',
  'expiry_reminders',
  'payment_reminders',
  'customer_purchase_history',
  'loyalty_discounts'
)
on conflict (plan_id, feature_id) do nothing;

-- Enterprise plan features (unlimited)
insert into public.plan_features (plan_id, feature_id, is_enabled, limits)
select
  'enterprise',
  f.id,
  true,
  '{}'::jsonb -- No limits for enterprise
from public.features f
on conflict (plan_id, feature_id) do nothing;

-- ============================================
-- STEP 11: Create function to assign Free plan on business creation
-- ============================================

create or replace function public.assign_free_plan_to_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_plan_id text;
begin
  -- Get the Free plan ID
  select id into v_free_plan_id
  from public.plans
  where slug = 'free' and is_active = true
  limit 1;

  if v_free_plan_id is not null then
    -- Create subscription for the new business
    insert into public.subscriptions (
      user_id,
      business_id,
      plan_id,
      status,
      payment_provider,
      is_admin_granted,
      current_start,
      current_end
    ) values (
      new.owner_id,
      new.id,
      v_free_plan_id,
      'active',
      'manual',
      false,
      now(),
      null -- No expiry for Free plan
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Create trigger on businesses table
drop trigger if exists on_business_created_assign_free_plan on public.businesses;
create trigger on_business_created_assign_free_plan
after insert on public.businesses
for each row execute function public.assign_free_plan_to_business();

-- ============================================
-- STEP 12: Migrate existing businesses.features to overrides
-- ============================================

-- Create a temporary mapping from feature names to feature keys
do $$
declare
  feature_record record;
  business_record record;
  feature_array text[];
  feature_name text;
  v_feature_key text;
  v_feature_id uuid;
begin
  -- For each business that has features
  for business_record in
    select id, owner_id, features
    from public.businesses
    where features is not null and array_length(features, 1) > 0
  loop
    feature_array := business_record.features;

    -- For each feature in the array
    for i in 1..array_length(feature_array, 1) loop
      feature_name := lower(trim(feature_array[i]));

      -- Map feature name to feature_key
      v_feature_key := case
        when feature_name like '%inventory%' then 'inventory_management'
        when feature_name like '%customer%' then 'customer_management'
        when feature_name like '%employee%' or feature_name like '%staff%' then 'employee_management'
        when feature_name like '%membership%' then 'membership_management'
        when feature_name like '%billing%' or feature_name like '%invoice%' then 'billing_invoicing'
        when feature_name like '%whatsapp%' then 'whatsapp_billing'
        when feature_name like '%email%' then 'email_billing'
        when feature_name like '%alert%' then 'smart_alerts'
        when feature_name like '%report%' or feature_name like '%analytics%' then 'advanced_reports'
        else null
      end;

      if v_feature_key is not null then
        -- Get the feature_id
        select f.id into v_feature_id
        from public.features f
        where f.feature_key = v_feature_key
        limit 1;

        if v_feature_id is not null then
          -- Insert override
          insert into public.business_feature_overrides (
            business_id,
            feature_id,
            is_enabled,
            reason,
            expires_at
          ) values (
            business_record.id,
            v_feature_id,
            true,
            'Migrated from legacy businesses.features array',
            null
          ) on conflict (business_id, feature_id) do nothing;
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- ============================================
-- STEP 13: Create database function for entitlement checking
-- ============================================

create or replace function public.check_business_feature_entitlement(
  p_business_id uuid,
  p_feature_key text,
  p_user_id uuid
)
returns table (
  has_access boolean,
  limit_value jsonb,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_plan_id text;
  v_feature_id uuid;
  v_override record;
  v_plan_feature record;
  v_is_admin boolean;
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return query select false, '{}'::jsonb, 'unauthorized'::text;
    return;
  end if;

  -- Get feature_id
  select id into v_feature_id
  from public.features
  where feature_key = p_feature_key and is_active = true;

  if v_feature_id is null then
    return query select false, '{}'::jsonb, 'feature_not_found'::text;
    return;
  end if;

  if not exists (
    select 1 from public.businesses where id = p_business_id
  ) then
    return query select false, '{}'::jsonb, 'business_not_found'::text;
    return;
  end if;

  select exists (
    select 1 from public.admin_roles
    where user_id = p_user_id and role in ('super_admin', 'admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = p_user_id
  ) then
    return query select false, '{}'::jsonb, 'unauthorized'::text;
    return;
  end if;

  if v_is_admin then
    return query select true, '{}'::jsonb, 'admin'::text;
    return;
  end if;

  -- Check for active override (highest priority)
  select * into v_override
  from public.business_feature_overrides
  where business_id = p_business_id
    and feature_id = v_feature_id
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if v_override is not null then
    return query select
      v_override.is_enabled,
      '{}'::jsonb,
      'override'::text;
    return;
  end if;

  -- Get active subscription for the business
  select * into v_subscription
  from public.subscriptions
  where business_id = p_business_id
    and status in ('active', 'authenticated')
    and (current_end is null or current_end > now())
  order by created_at desc
  limit 1;

  if v_subscription is null then
    -- No active subscription, fall back to Free plan
    v_plan_id := 'free';
  else
    v_plan_id := v_subscription.plan_id;
  end if;

  -- Check plan feature
  select * into v_plan_feature
  from public.plan_features
  where plan_id = v_plan_id
    and feature_id = v_feature_id;

  if v_plan_feature is not null and v_plan_feature.is_enabled then
    return query select
      true,
      v_plan_feature.limits,
      'plan'::text;
  else
    return query select
      false,
      '{}'::jsonb,
      'plan'::text;
  end if;

  return;
end;
$$;

-- ============================================
-- STEP 14: Create function to get business limits
-- ============================================

create or replace function public.get_business_limits(
  p_business_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  feature_record record;
  v_entitlement record;
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized to inspect business entitlements';
  end if;

  for feature_record in
    select id, feature_key from public.features where is_active = true
  loop
    select * into v_entitlement
    from public.check_business_feature_entitlement(
      p_business_id,
      feature_record.feature_key,
      p_user_id
    );

    v_result := v_result || jsonb_build_object(
      feature_record.feature_key,
      case when v_entitlement.has_access then v_entitlement.limit_value else null::jsonb end
    );
  end loop;

  return v_result;
end;
$$;

-- ============================================
-- STEP 15: Create function to check admin status
-- ============================================

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return false;
  end if;

  return exists (
    select 1 from public.admin_roles
    where user_id = p_user_id and role in ('super_admin', 'admin')
  );
end;
$$;

create or replace function public.is_super_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return false;
  end if;

  return exists (
    select 1 from public.admin_roles
    where user_id = p_user_id and role = 'super_admin'
  );
end;
$$;

drop function if exists public.admin_grant_business_subscription(uuid, text, text, timestamptz);
create or replace function public.admin_grant_business_subscription(
  p_business_id uuid,
  p_plan_id text,
  p_status text,
  p_current_end timestamptz,
  p_reason text
)
returns setof public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_subscription public.subscriptions;
begin
  if p_status is null or p_status not in ('active', 'pending', 'cancelled', 'expired') then
    raise exception 'Invalid subscription status';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'An explanation is required for manual subscription grants';
  end if;

  select owner_id into v_owner_id
  from public.businesses
  where id = p_business_id
  for update;
  if v_owner_id is null then
    raise exception 'Business not found';
  end if;

  if not exists (select 1 from public.plans where id = p_plan_id) then
    raise exception 'Plan not found';
  end if;

  insert into public.subscriptions (
    user_id,
    business_id,
    plan_id,
    status,
    payment_provider,
    razorpay_subscription_id,
    razorpay_plan_id,
    is_admin_granted,
    admin_reason,
    current_start,
    current_end,
    updated_at
  ) values (
    v_owner_id,
    p_business_id,
    p_plan_id,
    p_status,
    'manual',
    null,
    null,
    true,
    trim(p_reason),
    now(),
    p_current_end,
    now()
  )
  returning * into v_subscription;

  update public.subscriptions
  set status = 'replaced', updated_at = now()
  where business_id = p_business_id
    and id <> v_subscription.id
    and status in ('active', 'authenticated');

  return next v_subscription;
end;
$$;

-- A feature must be entitled at the database boundary, not only in the UI.
drop policy if exists "Owners can manage their inventory products" on public.inventory_products;
drop policy if exists "Owners can manage entitled inventory products" on public.inventory_products;
create policy "Owners can manage entitled inventory products" on public.inventory_products
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_products.business_id
        and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        inventory_products.business_id,
        'inventory_management',
        auth.uid()
      ) e where e.has_access
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_products.business_id
        and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        inventory_products.business_id,
        'inventory_management',
        auth.uid()
      ) e where e.has_access
    )
  );

drop policy if exists "Owners can manage their customers" on public.customers;
drop policy if exists "Owners can manage entitled customers" on public.customers;
create policy "Owners can manage entitled customers" on public.customers
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        customers.business_id,
        'customer_management',
        auth.uid()
      ) e where e.has_access
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        customers.business_id,
        'customer_management',
        auth.uid()
      ) e where e.has_access
    )
  );

drop policy if exists "Owners can manage their staff" on public.staff;
drop policy if exists "Owners can manage entitled staff" on public.staff;
create policy "Owners can manage entitled staff" on public.staff
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = staff.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        staff.business_id,
        'employee_management',
        auth.uid()
      ) e where e.has_access
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = staff.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        staff.business_id,
        'employee_management',
        auth.uid()
      ) e where e.has_access
    )
  );

drop policy if exists "Owners can manage their memberships" on public.memberships;
drop policy if exists "Owners can manage entitled memberships" on public.memberships;
create policy "Owners can manage entitled memberships" on public.memberships
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = memberships.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        memberships.business_id,
        'membership_management',
        auth.uid()
      ) e where e.has_access
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = memberships.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        memberships.business_id,
        'membership_management',
        auth.uid()
      ) e where e.has_access
    )
  );

drop policy if exists "Owners can manage their sales orders" on public.sales_orders;
drop policy if exists "Owners can manage entitled sales orders" on public.sales_orders;
create policy "Owners can manage entitled sales orders" on public.sales_orders
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = sales_orders.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        sales_orders.business_id,
        'billing_invoicing',
        auth.uid()
      ) e where e.has_access
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = sales_orders.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        sales_orders.business_id,
        'billing_invoicing',
        auth.uid()
      ) e where e.has_access
    )
  );

drop policy if exists "Owners can manage their sales order items" on public.sales_order_items;
drop policy if exists "Owners can manage entitled sales order items" on public.sales_order_items;
create policy "Owners can manage entitled sales order items" on public.sales_order_items
  for all using (
    exists (
      select 1
      from public.sales_orders o
      join public.businesses b on b.id = o.business_id
      where o.id = sales_order_items.order_id and b.owner_id = auth.uid()
        and exists (
          select 1 from public.check_business_feature_entitlement(
            o.business_id,
            'billing_invoicing',
            auth.uid()
          ) e where e.has_access
        )
    )
  )
  with check (
    exists (
      select 1
      from public.sales_orders o
      join public.businesses b on b.id = o.business_id
      where o.id = sales_order_items.order_id and b.owner_id = auth.uid()
        and exists (
          select 1 from public.check_business_feature_entitlement(
            o.business_id,
            'billing_invoicing',
            auth.uid()
          ) e where e.has_access
        )
    )
  );

drop policy if exists "Owners can manage their inventory stock history" on public.inventory_stock_history;
drop policy if exists "Owners can read entitled inventory stock history" on public.inventory_stock_history;
create policy "Owners can read entitled inventory stock history" on public.inventory_stock_history
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_stock_history.business_id and b.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.check_business_feature_entitlement(
        inventory_stock_history.business_id,
        'inventory_management',
        auth.uid()
      ) e where e.has_access
    )
  );

create or replace function public.enforce_business_feature_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := new.business_id;
  v_owner_id uuid;
  v_entitlement record;
  v_limit bigint;
  v_count bigint;
  v_feature_key text := tg_argv[0];
  v_limit_key text := tg_argv[1];
begin
  if tg_op = 'UPDATE' then
    if old.business_id = new.business_id then
      return new;
    end if;
  end if;

  select owner_id into v_owner_id
  from public.businesses
  where id = v_business_id
  for update;

  if v_owner_id is null then
    raise exception 'Business not found';
  end if;

  select * into v_entitlement
  from public.check_business_feature_entitlement(
    v_business_id,
    v_feature_key,
    coalesce(auth.uid(), v_owner_id)
  );

  if not coalesce(v_entitlement.has_access, false) then
    raise exception 'This business plan does not include %', v_feature_key
      using errcode = '42501';
  end if;

  v_limit := nullif(v_entitlement.limit_value ->> v_limit_key, '')::bigint;
  if v_limit is null then
    return new;
  end if;

  if tg_table_name = 'inventory_products' then
    select count(*) into v_count from public.inventory_products
    where business_id = v_business_id;
  elsif tg_table_name = 'customers' then
    select count(*) into v_count from public.customers
    where business_id = v_business_id;
  elsif tg_table_name = 'staff' then
    select count(*) into v_count from public.staff
    where business_id = v_business_id;
  elsif tg_table_name = 'memberships' then
    select count(*) into v_count from public.memberships
    where business_id = v_business_id;
  elsif tg_table_name = 'sales_orders' then
    select count(*) into v_count from public.sales_orders
    where business_id = v_business_id
      and created_at >= date_trunc('month', now());
  else
    raise exception 'Unsupported table for feature limits: %', tg_table_name;
  end if;

  if v_count >= v_limit then
    raise exception 'The % limit of % has been reached', v_limit_key, v_limit
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_products_entitlement_limit on public.inventory_products;
create trigger inventory_products_entitlement_limit
  before insert or update on public.inventory_products
  for each row execute function public.enforce_business_feature_limit(
    'inventory_management', 'max_products'
  );

drop trigger if exists customers_entitlement_limit on public.customers;
create trigger customers_entitlement_limit
  before insert or update on public.customers
  for each row execute function public.enforce_business_feature_limit(
    'customer_management', 'max_customers'
  );

drop trigger if exists staff_entitlement_limit on public.staff;
create trigger staff_entitlement_limit
  before insert or update on public.staff
  for each row execute function public.enforce_business_feature_limit(
    'employee_management', 'max_employees'
  );

drop trigger if exists memberships_entitlement_limit on public.memberships;
create trigger memberships_entitlement_limit
  before insert or update on public.memberships
  for each row execute function public.enforce_business_feature_limit(
    'membership_management', 'max_memberships'
  );

drop trigger if exists sales_orders_entitlement_limit on public.sales_orders;
create trigger sales_orders_entitlement_limit
  before insert or update on public.sales_orders
  for each row execute function public.enforce_business_feature_limit(
    'billing_invoicing', 'max_monthly_invoices'
  );

-- ============================================
-- STEP 16: Update existing subscriptions to link to businesses
-- ============================================

-- Migrate legacy account subscriptions only when there is exactly one owned business.
-- Ambiguous rows are retained unchanged for an explicit admin mapping.
update public.subscriptions s
set business_id = (
  select b.id
  from public.businesses b
  where b.owner_id = s.user_id
)
where s.business_id is null
  and (
    select count(*) from public.businesses b where b.owner_id = s.user_id
  ) = 1;

-- Give every existing business a Free subscription unless it already has a
-- non-expired business-scoped subscription.
insert into public.subscriptions (
  user_id,
  business_id,
  plan_id,
  status,
  payment_provider,
  is_admin_granted,
  current_start,
  current_end
)
select
  b.owner_id,
  b.id,
  p.id,
  'active',
  'manual',
  false,
  now(),
  null
from public.businesses b
join public.plans p on p.slug = 'free' and p.is_active = true
where not exists (
  select 1
  from public.subscriptions s
  where s.business_id = b.id
    and s.status in ('active', 'authenticated')
    and (s.current_end is null or s.current_end > now())
);

-- ============================================
-- STEP 17: Create indexes for performance
-- ============================================

create index if not exists plan_features_plan_idx on public.plan_features(plan_id);
create index if not exists plan_features_feature_idx on public.plan_features(feature_id);
create index if not exists subscriptions_business_status_idx on public.subscriptions(business_id, status);
create index if not exists payments_subscription_idx on public.payments(subscription_id);

-- ============================================
-- STEP 18: Grant necessary permissions
-- ============================================

-- Grant usage on schemas
grant usage on schema public to anon, authenticated;

-- Grant select on public tables
grant select on public.features to anon, authenticated;
grant select on public.plans to anon, authenticated;
grant select on public.plan_features to anon, authenticated;

-- Grant authenticated users more access
grant select on public.subscriptions to authenticated;
grant select on public.payments to authenticated;
grant select on public.business_feature_overrides to authenticated;
grant select on public.admin_roles to authenticated;

revoke all on function public.check_business_feature_entitlement(uuid, text, uuid) from public, anon;
revoke all on function public.get_business_limits(uuid, uuid) from public, anon;
revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.is_super_admin(uuid) from public, anon;
revoke all on function public.admin_grant_business_subscription(uuid, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.check_business_feature_entitlement(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.get_business_limits(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;
grant execute on function public.admin_grant_business_subscription(uuid, text, text, timestamptz, text) to service_role;

-- ============================================
-- STEP 19: Create view for active subscriptions with plan details
-- ============================================

create or replace view public.active_subscriptions_view as
select
  s.id,
  s.business_id,
  b.name as business_name,
  s.user_id,
  p.name as plan_name,
  p.slug as plan_slug,
  s.status,
  s.payment_provider,
  s.razorpay_subscription_id,
  s.current_start,
  s.current_end,
  s.cancel_at_period_end,
  s.is_admin_granted,
  s.paid_count,
  s.created_at,
  s.updated_at
from public.subscriptions s
join public.businesses b on b.id = s.business_id
join public.plans p on p.id = s.plan_id
where s.status in ('active', 'authenticated', 'pending')
  and (s.current_end is null or s.current_end > now());

-- ============================================
-- STEP 20: Migration complete
-- ============================================

-- Log migration completion
do $$
begin
  raise notice 'Subscription system migration completed successfully';
  raise notice 'New tables: features, plan_features, business_feature_overrides, admin_roles';
  raise notice 'Extended tables: plans (renamed from payment_plans), subscriptions, payments';
  raise notice 'Trigger: assign_free_plan_to_business (auto-assigns Free plan on business creation)';
  raise notice 'Functions: check_business_feature_entitlement, get_business_limits, is_admin, is_super_admin';
  raise notice 'View: active_subscriptions_view';
end $$;
