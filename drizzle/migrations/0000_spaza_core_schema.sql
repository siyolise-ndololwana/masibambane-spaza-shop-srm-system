-- Roles
create type public.app_role as enum ('owner','cashier');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'owner'));

-- new user -> profile + default cashier role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'cashier'))
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "suppliers read" on public.suppliers for select to authenticated using (true);
create policy "suppliers write" on public.suppliers for all to authenticated using (true) with check (true);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  selling_price numeric(10,2) not null default 0,
  cost_price numeric(10,2) not null default 0,
  quantity integer not null default 0,
  reorder_level integer not null default 10,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products read" on public.products for select to authenticated using (true);
create policy "products write" on public.products for all to authenticated using (true) with check (true);

-- Sales
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete set null,
  sale_date timestamptz not null default now(),
  total_amount numeric(10,2) not null default 0,
  payment_method text not null default 'Cash'
);
grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "sales read" on public.sales for select to authenticated using (true);
create policy "sales write" on public.sales for all to authenticated using (true) with check (true);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);
grant select, insert, update, delete on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;
create policy "sale_items read" on public.sale_items for select to authenticated using (true);
create policy "sale_items write" on public.sale_items for all to authenticated using (true) with check (true);

-- Deduct stock on sale item insert
create or replace function public.deduct_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.product_id is not null then
    update public.products set quantity = greatest(quantity - new.quantity, 0) where id = new.product_id;
  end if;
  return new;
end;
$$;
create trigger sale_item_deduct_stock after insert on public.sale_items
for each row execute function public.deduct_stock();

-- Stock deliveries
create table public.stock_deliveries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity integer not null,
  unit_cost numeric(10,2) not null default 0,
  date_received timestamptz not null default now(),
  received_by uuid default auth.uid()
);
grant select, insert, update, delete on public.stock_deliveries to authenticated;
grant all on public.stock_deliveries to service_role;
alter table public.stock_deliveries enable row level security;
create policy "deliveries read" on public.stock_deliveries for select to authenticated using (true);
create policy "deliveries write" on public.stock_deliveries for all to authenticated using (true) with check (true);

create or replace function public.add_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products set quantity = quantity + new.quantity where id = new.product_id;
  return new;
end;
$$;
create trigger delivery_add_stock after insert on public.stock_deliveries
for each row execute function public.add_stock();

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null default 'Other',
  amount numeric(10,2) not null,
  expense_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "expenses read" on public.expenses for select to authenticated using (true);
create policy "expenses write" on public.expenses for all to authenticated using (true) with check (true);
