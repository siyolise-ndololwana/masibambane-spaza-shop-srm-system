CREATE TABLE public.stock_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','cancelled')),
  notes text,
  ordered_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_orders TO authenticated;
GRANT ALL ON public.stock_orders TO service_role;
ALTER TABLE public.stock_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read" ON public.stock_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders write" ON public.stock_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.add_stock()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  perform set_config('app.stock_reason',
    coalesce(nullif(current_setting('app.stock_reason', true), ''), 'Stock delivery received'), true);
  update products set quantity = quantity + new.quantity where id = new.product_id;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.receive_stock_order()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare sname text;
begin
  if new.status = 'received' and old.status <> 'received' then
    select name into sname from suppliers where id = new.supplier_id;
    new.received_at := now();
    perform set_config('app.stock_reason',
      'Stock order received (' || new.quantity || ' from ' || coalesce(sname, 'supplier') || ')', true);
    insert into stock_deliveries(product_id, supplier_id, quantity, unit_cost, received_by)
    values (new.product_id, new.supplier_id, new.quantity, new.unit_price, auth.uid());
  end if;
  return new;
end $$;

CREATE TRIGGER stock_order_receive BEFORE UPDATE ON public.stock_orders
FOR EACH ROW EXECUTE FUNCTION public.receive_stock_order();