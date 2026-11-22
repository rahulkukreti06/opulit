create table if not exists public.payment_plans (
  id text primary key,
  name text not null,
  amount integer not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  interval text not null default 'monthly',
  active boolean not null default true,
  razorpay_plan_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.payment_plans (id, name, amount, currency, interval, active)
values
  ('professional', 'Professional', 39900, 'INR', 'monthly', true),
  ('enterprise', 'Enterprise', 79900, 'INR', 'monthly', true)
on conflict (id) do update set
  name = excluded.name,
  amount = excluded.amount,
  currency = excluded.currency,
  interval = excluded.interval,
  active = excluded.active;

create table if not exists public.razorpay_orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.payment_plans(id),
  amount integer not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'created',
  receipt text,
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.payment_plans(id),
  razorpay_order_id text references public.razorpay_orders(id),
  razorpay_subscription_id text,
  razorpay_payment_id text not null unique,
  amount integer not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null,
  method text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.payment_plans(id),
  razorpay_subscription_id text not null unique,
  status text not null,
  paid_count integer not null default 0,
  current_start timestamptz,
  current_end timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_name text not null,
  payload jsonb not null,
  status text not null default 'processing',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists razorpay_orders_user_created_idx on public.razorpay_orders(user_id, created_at desc);
create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);
create index if not exists subscriptions_user_updated_idx on public.subscriptions(user_id, updated_at desc);

alter table public.payment_plans enable row level security;
alter table public.razorpay_orders enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "Customers can read active plans" on public.payment_plans;
create policy "Customers can read active plans" on public.payment_plans
  for select using (active = true);

drop policy if exists "Customers can read their orders" on public.razorpay_orders;
create policy "Customers can read their orders" on public.razorpay_orders
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read their payments" on public.payments;
create policy "Customers can read their payments" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "Customers can read their subscriptions" on public.subscriptions;
create policy "Customers can read their subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
