create table public.inventory_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  old_quantity integer not null default 0,
  new_quantity integer not null,
  change integer not null,
  reason text not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
grant select on public.inventory_log to authenticated;
grant all on public.inventory_log to service_role;
alter table public.inventory_log enable row level security;
create policy "Staff can read inventory log" on public.inventory_log for select to authenticated using (true);
create index inventory_log_changed_at_idx on public.inventory_log (changed_at desc);

create or replace function public.log_stock_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := nullif(current_setting('app.stock_reason', true), '');
begin
  if tg_op = 'INSERT' then
    if new.quantity <> 0 then
      insert into inventory_log(product_id, product_name, old_quantity, new_quantity, change, reason, changed_by)
      values (new.id, new.name, 0, new.quantity, new.quantity, 'Opening stock (new product)', auth.uid());
    end if;
  elsif new.quantity is distinct from old.quantity then
    insert into inventory_log(product_id, product_name, old_quantity, new_quantity, change, reason, changed_by)
    values (new.id, new.name, old.quantity, new.quantity, new.quantity - old.quantity, coalesce(r, 'Manual adjustment'), auth.uid());
  end if;
  perform set_config('app.stock_reason', '', true);
  return new;
end $$;
create trigger products_log_stock after insert or update of quantity on public.products
for each row execute function public.log_stock_change();

create or replace function public.deduct_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.product_id is not null then
    perform set_config('app.stock_reason', 'Sale (' || new.quantity || ' sold)', true);
    update products set quantity = greatest(quantity - new.quantity, 0) where id = new.product_id;
  end if;
  return new;
end $$;

create or replace function public.add_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.stock_reason', 'Stock delivery received', true);
  update products set quantity = quantity + new.quantity where id = new.product_id;
  return new;
end $$;