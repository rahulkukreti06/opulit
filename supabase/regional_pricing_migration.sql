-- ============================================
-- REGIONAL PRICING SYSTEM
-- Migration: Regional Pricing v1.0
-- ============================================

-- This migration creates a system for storing regional pricing
-- so the backend can securely verify Razorpay payment amounts

-- ============================================
-- STEP 1: Create regional_prices table
-- ============================================

create table if not exists public.regional_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete cascade,
  region_code text not null, -- e.g., 'IN', 'US', 'EU'
  currency_code text not null check (char_length(currency_code) = 3),
  amount integer not null check (amount >= 0),
  display_name text, -- e.g., 'India', 'United States'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, region_code)
);

alter table public.regional_prices
  add column if not exists razorpay_plan_id text;

create unique index if not exists regional_prices_razorpay_plan_id_idx
  on public.regional_prices(razorpay_plan_id)
  where razorpay_plan_id is not null;

create or replace function public.reset_razorpay_plan_after_regional_price_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.amount is distinct from old.amount
    or new.currency_code is distinct from old.currency_code then
    new.razorpay_plan_id := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists regional_prices_reset_razorpay_plan on public.regional_prices;
create trigger regional_prices_reset_razorpay_plan
  before update on public.regional_prices
  for each row execute function public.reset_razorpay_plan_after_regional_price_change();

-- ============================================
-- STEP 2: Enable RLS
-- ============================================

alter table public.regional_prices enable row level security;

-- Policy: Anyone can read active regional prices
drop policy if exists "Anyone can read active regional prices" on public.regional_prices;
create policy "Anyone can read active regional prices"
  on public.regional_prices for select
  using (is_active = true);

-- ============================================
-- STEP 3: Insert initial regional pricing
-- ============================================

-- Amounts mirror src/regionalPricing.js; monetary values use the currency's
-- smallest unit except currencies with no fractional unit (for example JPY).
insert into public.regional_prices
  (plan_id, region_code, currency_code, amount, display_name, is_active)
values
  ('professional', 'IN', 'INR', 39900, 'India', true),
  ('professional', 'US', 'USD', 2000, 'United States', true),
  ('professional', 'EU', 'EUR', 1900, 'Europe', true),
  ('professional', 'GB', 'GBP', 1600, 'United Kingdom', true),
  ('professional', 'CA', 'CAD', 2700, 'Canada', true),
  ('professional', 'AU', 'AUD', 3000, 'Australia', true),
  ('professional', 'NZ', 'NZD', 3300, 'New Zealand', true),
  ('professional', 'SG', 'SGD', 2700, 'Singapore', true),
  ('professional', 'AE', 'AED', 7400, 'United Arab Emirates', true),
  ('professional', 'SA', 'SAR', 7500, 'Saudi Arabia', true),
  ('professional', 'JP', 'JPY', 3000, 'Japan', true),
  ('enterprise', 'IN', 'INR', 79900, 'India', true),
  ('enterprise', 'US', 'USD', 3500, 'United States', true),
  ('enterprise', 'EU', 'EUR', 3200, 'Europe', true),
  ('enterprise', 'GB', 'GBP', 2800, 'United Kingdom', true),
  ('enterprise', 'CA', 'CAD', 4700, 'Canada', true),
  ('enterprise', 'AU', 'AUD', 5300, 'Australia', true),
  ('enterprise', 'NZ', 'NZD', 5700, 'New Zealand', true),
  ('enterprise', 'SG', 'SGD', 4700, 'Singapore', true),
  ('enterprise', 'AE', 'AED', 12900, 'United Arab Emirates', true),
  ('enterprise', 'SA', 'SAR', 13100, 'Saudi Arabia', true),
  ('enterprise', 'JP', 'JPY', 5200, 'Japan', true)
on conflict (plan_id, region_code) do nothing;

-- ============================================
-- STEP 4: Create function to get pricing for a region
-- ============================================

create or replace function public.get_plan_pricing(p_plan_id text, p_region_code text default 'IN')
returns table (
  plan_id text,
  region_code text,
  currency_code text,
  amount integer,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    rp.plan_id,
    rp.region_code,
    rp.currency_code,
    rp.amount,
    rp.display_name
  from public.regional_prices rp
  where rp.plan_id = p_plan_id
    and rp.region_code = p_region_code
    and rp.is_active = true
  limit 1;

  -- If no exact match, try to return default (IN)
  if not found then
    return query
    select
      rp.plan_id,
      rp.region_code,
      rp.currency_code,
      rp.amount,
      rp.display_name
    from public.regional_prices rp
    where rp.plan_id = p_plan_id
      and rp.region_code = 'IN'
      and rp.is_active = true
    limit 1;
  end if;
end;
$$;

-- ============================================
-- STEP 5: Create function to get all regional pricing for a plan
-- ============================================

create or replace function public.get_all_plan_pricing(p_plan_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  price_record record;
begin
  for price_record in
    select region_code, currency_code, amount, display_name
    from public.regional_prices
    where plan_id = p_plan_id and is_active = true
  loop
    v_result := v_result || jsonb_build_object(
      price_record.region_code,
      jsonb_build_object(
        'currency', price_record.currency_code,
        'amount', price_record.amount,
        'display_name', price_record.display_name
      )
    );
  end loop;

  return v_result;
end;
$$;

-- ============================================
-- STEP 6: Create function to verify payment amount
-- ============================================

create or replace function public.verify_payment_amount(
  p_plan_id text,
  p_region_code text,
  p_amount integer,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_amount integer;
  v_expected_currency text;
begin
  select amount, currency_code
  into v_expected_amount, v_expected_currency
  from public.regional_prices
  where plan_id = p_plan_id
    and region_code = p_region_code
    and is_active = true
  limit 1;

  -- If no regional pricing found, check default (IN)
  if v_expected_amount is null then
    select amount, currency_code
    into v_expected_amount, v_expected_currency
    from public.regional_prices
    where plan_id = p_plan_id
      and region_code = 'IN'
      and is_active = true
    limit 1;
  end if;

  -- Verify amount and currency match
  return v_expected_amount = p_amount
    and v_expected_currency = p_currency;
end;
$$;

-- ============================================
-- STEP 7: Create view for pricing with plan details
-- ============================================

create or replace view public.pricing_view as
select
  p.id as plan_id,
  p.name as plan_name,
  p.slug as plan_slug,
  rp.region_code,
  rp.currency_code,
  rp.amount,
  rp.display_name as region_name,
  p.is_active as plan_is_active,
  rp.is_active as price_is_active
from public.plans p
left join public.regional_prices rp on rp.plan_id = p.id
where p.is_active = true;

-- ============================================
-- STEP 8: Create indexes
-- ============================================

create index if not exists regional_prices_plan_idx on public.regional_prices(plan_id);
create index if not exists regional_prices_region_idx on public.regional_prices(region_code);
create index if not exists regional_prices_plan_region_idx on public.regional_prices(plan_id, region_code);

-- ============================================
-- STEP 9: Grant permissions
-- ============================================

grant select on public.regional_prices to anon, authenticated;
grant select on public.pricing_view to anon, authenticated;

-- ============================================
-- STEP 10: Migration complete
-- ============================================

do $$
begin
  raise notice 'Regional pricing migration completed successfully';
  raise notice 'New table: regional_prices';
  raise notice 'Functions: get_plan_pricing, get_all_plan_pricing, verify_payment_amount';
  raise notice 'View: pricing_view';
end $$;
