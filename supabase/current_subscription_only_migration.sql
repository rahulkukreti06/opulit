-- Keep one subscription record per business instead of retaining plan history.
-- Run after subscription_system_migration.sql.
begin;

create or replace function public.keep_only_current_business_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_id is null then
    return new;
  end if;

  perform 1
  from public.businesses
  where id = new.business_id
  for update;

  delete from public.subscriptions
  where business_id = new.business_id
    and id <> new.id;

  return new;
end;
$$;

drop trigger if exists subscriptions_keep_current_after_insert on public.subscriptions;
create trigger subscriptions_keep_current_after_insert
  after insert on public.subscriptions
  for each row
  when (new.status in ('active', 'authenticated'))
  execute function public.keep_only_current_business_subscription();

drop trigger if exists subscriptions_keep_current_after_activation on public.subscriptions;
create trigger subscriptions_keep_current_after_activation
  after update of status on public.subscriptions
  for each row
  when (
    new.status in ('active', 'authenticated')
    and old.status is distinct from new.status
  )
  execute function public.keep_only_current_business_subscription();

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

  delete from public.subscriptions
  where business_id = p_business_id
    and id <> v_subscription.id;

  return next v_subscription;
end;
$$;

-- A captured payment is sufficient evidence to activate a subscription even
-- if its webhook or checkout verification did not update the initial status.
-- Import captured subscription payments from already-processed webhook events,
-- which older webhook handling recorded without linking to a subscription.
insert into public.payments (
  user_id,
  subscription_id,
  plan_id,
  razorpay_subscription_id,
  razorpay_payment_id,
  amount,
  currency,
  status,
  method
)
select
  s.user_id,
  s.id,
  s.plan_id,
  s.razorpay_subscription_id,
  p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'id',
  (p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'amount')::integer,
  p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'currency',
  'captured',
  p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'method'
from public.webhook_events p
join public.subscriptions s
  on s.razorpay_subscription_id = (
    p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'subscription_id'
  )
where p.event_name = 'payment.captured'
  and (p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'id') is not null
  and (p.payload -> 'payload' -> 'payment' -> 'entity' ->> 'amount') ~ '^[0-9]+$'
on conflict (razorpay_payment_id) do update set
  subscription_id = excluded.subscription_id,
  plan_id = excluded.plan_id,
  status = 'captured';

update public.subscriptions s
set status = 'active',
    updated_at = now()
where s.payment_provider = 'razorpay'
  and s.status = 'created'
  and exists (
    select 1
    from public.payments p
    where p.status = 'captured'
      and (
        p.subscription_id = s.id
        or p.razorpay_subscription_id = s.razorpay_subscription_id
      )
  );

-- Keep the most relevant existing row and remove subscription history. Payment
-- records remain intact; their subscription_id is set to null by its FK.
with ranked_subscriptions as (
  select
    id,
    row_number() over (
      partition by business_id
      order by
        case
          when status in ('active', 'authenticated')
            and (current_end is null or current_end > now()) then 0
          when status in ('created', 'pending') then 1
          else 2
        end,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as row_number
  from public.subscriptions
  where business_id is not null
)
delete from public.subscriptions s
using ranked_subscriptions r
where s.id = r.id
  and r.row_number > 1;

commit;
