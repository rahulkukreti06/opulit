create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, email text, avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.businesses (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null check (char_length(trim(name)) > 0), business_type text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.businesses add column if not exists role text;
alter table public.businesses add column if not exists features text[] not null default '{}';
alter table public.businesses add column if not exists business_size text;
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Owners can view their businesses" on public.businesses;
drop policy if exists "Owners can create their businesses" on public.businesses;
drop policy if exists "Owners can update their businesses" on public.businesses;
drop policy if exists "Owners can delete their businesses" on public.businesses;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Owners can view their businesses" on public.businesses for select using (auth.uid() = owner_id);
create policy "Owners can create their businesses" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "Owners can update their businesses" on public.businesses for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners can delete their businesses" on public.businesses for delete using (auth.uid() = owner_id);

create table if not exists public.inventory_products (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	name text not null check (char_length(trim(name)) > 0),
	image_url text,
	quantity integer not null default 0 check (quantity >= 0),
	sku text,
	category text,
	brand text,
	unit text not null default 'Piece',
	low_stock_alert integer check (low_stock_alert >= 0),
	cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
	selling_price numeric(12, 2) not null default 0 check (selling_price >= 0),
	description text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.inventory_products add column if not exists sku text;
alter table public.inventory_products add column if not exists category text;
alter table public.inventory_products add column if not exists brand text;
alter table public.inventory_products add column if not exists unit text not null default 'Piece';
alter table public.inventory_products add column if not exists low_stock_alert integer;
alter table public.inventory_products add column if not exists cost_price numeric(12, 2) not null default 0;
alter table public.inventory_products add column if not exists selling_price numeric(12, 2) not null default 0;
alter table public.inventory_products add column if not exists description text;

create table if not exists public.inventory_stock_history (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	product_id uuid not null,
	quantity integer not null check (quantity >= 0),
	cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
	recorded_at timestamptz not null default now()
);

create index if not exists inventory_stock_history_business_recorded_idx
	on public.inventory_stock_history(business_id, recorded_at);
create index if not exists inventory_stock_history_product_recorded_idx
	on public.inventory_stock_history(product_id, recorded_at);

alter table public.inventory_stock_history enable row level security;
drop policy if exists "Owners can manage their inventory stock history" on public.inventory_stock_history;
create policy "Owners can manage their inventory stock history" on public.inventory_stock_history
	for all using (exists (select 1 from public.businesses where businesses.id = inventory_stock_history.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = inventory_stock_history.business_id and businesses.owner_id = auth.uid()));

create or replace function public.record_inventory_stock_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if tg_op = 'INSERT'
		or tg_op = 'DELETE'
		or old.quantity is distinct from new.quantity
		or old.cost_price is distinct from new.cost_price then
		insert into public.inventory_stock_history (business_id, product_id, quantity, cost_price, recorded_at)
		values (
			coalesce(new.business_id, old.business_id),
			coalesce(new.id, old.id),
			coalesce(new.quantity, old.quantity),
			coalesce(new.cost_price, old.cost_price),
			case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
		);
	end if;
	return coalesce(new, old);
end;
$$;

drop trigger if exists inventory_products_stock_history_trigger on public.inventory_products;
create trigger inventory_products_stock_history_trigger
after insert or update or delete on public.inventory_products
for each row execute function public.record_inventory_stock_history();

insert into public.inventory_stock_history (business_id, product_id, quantity, cost_price, recorded_at)
select product.business_id, product.id, product.quantity, product.cost_price, product.created_at
from public.inventory_products product
where not exists (
	select 1
	from public.inventory_stock_history history
	where history.product_id = product.id
);

create table if not exists public.customers (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	name text not null check (char_length(trim(name)) > 0),
	phone text,
	email text,
	became_customer_at date not null default current_date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.staff (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	name text not null check (char_length(trim(name)) > 0),
	phone text,
	email text,
	role text,
	salary numeric(12, 2) check (salary is null or salary >= 0),
	joined_at date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	customer_id uuid references public.customers(id) on delete set null,
	name text not null check (char_length(trim(name)) > 0),
	phone text,
	email text,
	address text,
	started_at date not null default current_date,
	monthly_fee numeric(12, 2) check (monthly_fee is null or monthly_fee >= 0),
	paid_monthly boolean not null default false,
	last_paid_at date,
	next_payment_due_at date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.sales_orders (
	id uuid primary key default gen_random_uuid(),
	business_id uuid not null references public.businesses(id) on delete cascade,
	customer_id uuid references public.customers(id) on delete set null,
	status text not null default 'completed' check (status in ('completed', 'void')),
	payment_status text not null default 'paid' check (payment_status in ('paid', 'partial', 'unpaid')),
	subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
	total numeric(12, 2) not null default 0 check (total >= 0),
	paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0 and paid_amount <= total),
	sold_at timestamptz not null default now(),
	created_at timestamptz not null default now()
);

alter table public.sales_orders add column if not exists invoice_number text;
alter table public.sales_orders add column if not exists invoice_date date;
alter table public.sales_orders add column if not exists due_date date;
alter table public.sales_orders add column if not exists payment_terms text;
alter table public.sales_orders add column if not exists discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0);
alter table public.sales_orders add column if not exists invoice_notes text;
alter table public.sales_orders add column if not exists invoice_terms text;

create table if not exists public.sales_order_items (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.sales_orders(id) on delete cascade,
	product_id uuid not null references public.inventory_products(id) on delete restrict,
	quantity integer not null check (quantity > 0),
	unit_price numeric(12, 2) not null check (unit_price >= 0),
	cost_price numeric(12, 2) not null default 0 check (cost_price >= 0)
);

create index if not exists inventory_products_business_id_idx on public.inventory_products(business_id);
create index if not exists customers_business_id_idx on public.customers(business_id);
create index if not exists staff_business_id_idx on public.staff(business_id);
create index if not exists memberships_business_id_idx on public.memberships(business_id);
create index if not exists memberships_customer_id_idx on public.memberships(customer_id);
create index if not exists sales_orders_business_sold_idx on public.sales_orders(business_id, sold_at);
create index if not exists sales_orders_customer_idx on public.sales_orders(customer_id);
create index if not exists sales_order_items_order_idx on public.sales_order_items(order_id);

alter table public.inventory_products enable row level security;
alter table public.customers enable row level security;
alter table public.staff enable row level security;
alter table public.memberships enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;

drop policy if exists "Owners can manage their inventory products" on public.inventory_products;
create policy "Owners can manage their inventory products" on public.inventory_products
	for all using (exists (select 1 from public.businesses where businesses.id = inventory_products.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = inventory_products.business_id and businesses.owner_id = auth.uid()));
drop policy if exists "Owners can manage their customers" on public.customers;
create policy "Owners can manage their customers" on public.customers
	for all using (exists (select 1 from public.businesses where businesses.id = customers.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = customers.business_id and businesses.owner_id = auth.uid()));

drop policy if exists "Owners can manage their staff" on public.staff;
create policy "Owners can manage their staff" on public.staff
	for all using (exists (select 1 from public.businesses where businesses.id = staff.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = staff.business_id and businesses.owner_id = auth.uid()));

drop policy if exists "Owners can manage their memberships" on public.memberships;
create policy "Owners can manage their memberships" on public.memberships
	for all using (exists (select 1 from public.businesses where businesses.id = memberships.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = memberships.business_id and businesses.owner_id = auth.uid()));
drop policy if exists "Owners can manage their sales orders" on public.sales_orders;
create policy "Owners can manage their sales orders" on public.sales_orders
	for all using (exists (select 1 from public.businesses where businesses.id = sales_orders.business_id and businesses.owner_id = auth.uid()))
	with check (exists (select 1 from public.businesses where businesses.id = sales_orders.business_id and businesses.owner_id = auth.uid()));
drop policy if exists "Owners can manage their sales order items" on public.sales_order_items;
create policy "Owners can manage their sales order items" on public.sales_order_items
	for all using (exists (
		select 1 from public.sales_orders
		join public.businesses on businesses.id = sales_orders.business_id
		where sales_orders.id = sales_order_items.order_id and businesses.owner_id = auth.uid()
	))
	with check (exists (
		select 1 from public.sales_orders
		join public.businesses on businesses.id = sales_orders.business_id
		where sales_orders.id = sales_order_items.order_id and businesses.owner_id = auth.uid()
	));

create or replace function public.record_sale(
	p_business_id uuid,
	p_product_id uuid,
	p_quantity integer,
	p_customer_id uuid default null,
	p_payment_status text default 'paid',
	p_paid_amount numeric default null
)
returns public.sales_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
	v_product public.inventory_products;
	v_order public.sales_orders;
	v_total numeric(12, 2);
	v_paid numeric(12, 2);
begin
	if not exists (select 1 from public.businesses where id = p_business_id and owner_id = auth.uid()) then
		raise exception 'You do not have access to this business';
	end if;
	if p_quantity is null or p_quantity < 1 then
		raise exception 'Sale quantity must be at least one';
	end if;
	if p_payment_status not in ('paid', 'partial', 'unpaid') then
		raise exception 'Invalid payment status';
	end if;
	select * into v_product from public.inventory_products where id = p_product_id and business_id = p_business_id for update;
	if not found then raise exception 'Product not found'; end if;
	if v_product.quantity < p_quantity then raise exception 'Not enough stock for this sale'; end if;
	v_total := round(v_product.selling_price * p_quantity, 2);
	v_paid := case when p_payment_status = 'paid' then v_total when p_payment_status = 'unpaid' then 0 else least(greatest(coalesce(p_paid_amount, 0), 0), v_total) end;
	insert into public.sales_orders (business_id, customer_id, payment_status, subtotal, total, paid_amount)
	values (p_business_id, p_customer_id, p_payment_status, v_total, v_total, v_paid)
	returning * into v_order;
	insert into public.sales_order_items (order_id, product_id, quantity, unit_price, cost_price)
	values (v_order.id, v_product.id, p_quantity, v_product.selling_price, v_product.cost_price);
	update public.inventory_products set quantity = quantity - p_quantity, updated_at = now() where id = v_product.id;
	return v_order;
end;
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, full_name, email, avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email, new.raw_user_meta_data->>'avatar_url') on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, avatar_url = excluded.avatar_url, updated_at = now(); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();