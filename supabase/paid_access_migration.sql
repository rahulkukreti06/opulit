-- Require an active paid plan before granting feature entitlements.
-- Admins retain access, and feature overrides remain available to paid businesses.
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
  v_feature_id uuid;
  v_override record;
  v_plan_feature record;
  v_is_admin boolean;
begin
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    return query select false, '{}'::jsonb, 'unauthorized'::text;
    return;
  end if;

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

  select s.*, p.slug as plan_slug
  into v_subscription
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.business_id = p_business_id
    and s.status in ('active', 'authenticated')
    and (s.current_end is null or s.current_end > now())
    and p.slug <> 'free'
  order by s.created_at desc
  limit 1;

  if not found then
    return query select false, '{}'::jsonb, 'payment_required'::text;
    return;
  end if;

  select * into v_override
  from public.business_feature_overrides
  where business_id = p_business_id
    and feature_id = v_feature_id
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if found then
    return query select v_override.is_enabled, '{}'::jsonb, 'override'::text;
    return;
  end if;

  select * into v_plan_feature
  from public.plan_features
  where plan_id = v_subscription.plan_id
    and feature_id = v_feature_id;

  if v_plan_feature is not null and v_plan_feature.is_enabled then
    return query select true, v_plan_feature.limits, 'plan'::text;
  else
    return query select false, '{}'::jsonb, 'plan'::text;
  end if;
end;
$$;

revoke all on function public.check_business_feature_entitlement(uuid, text, uuid) from public, anon;
grant execute on function public.check_business_feature_entitlement(uuid, text, uuid) to authenticated, service_role;
