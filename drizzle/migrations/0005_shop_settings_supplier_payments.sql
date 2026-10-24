CREATE TABLE public.shop_settings (id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read settings" ON public.shop_settings FOR SELECT TO authenticated USING(true);
CREATE POLICY "staff insert settings" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK(true);
CREATE POLICY "staff update settings" ON public.shop_settings FOR UPDATE TO authenticated USING(true) WITH CHECK(true);
ALTER TABLE public.stock_orders ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid'));
ALTER TABLE public.stock_orders ADD COLUMN paid_amount numeric;
ALTER TABLE public.stock_orders ADD COLUMN paid_at timestamptz;
ALTER TABLE public.stock_orders ADD COLUMN paid_by uuid;
ALTER TABLE public.stock_orders ADD COLUMN payment_reference text;
ALTER TABLE public.expenses ADD COLUMN stock_order_id uuid REFERENCES public.stock_orders(id);
CREATE UNIQUE INDEX expenses_one_supplier_payment ON public.expenses(stock_order_id) WHERE stock_order_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.confirm_supplier_payment(p_order_id uuid, p_amount numeric, p_reference text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.stock_orders; expense_id uuid; supplier_name text; product_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to confirm payments'; END IF;
 IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount,2) THEN RAISE EXCEPTION 'Enter a positive amount with at most two decimal places'; END IF;
 IF length(coalesce(p_reference,'')) > 200 THEN RAISE EXCEPTION 'Payment reference is too long'; END IF;
 SELECT * INTO o FROM public.stock_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.status='cancelled' THEN RAISE EXCEPTION 'Cannot pay a cancelled order'; END IF;
 IF o.payment_status='paid' THEN RAISE EXCEPTION 'Payment already recorded'; END IF;
 SELECT name INTO supplier_name FROM public.suppliers WHERE id=o.supplier_id;
 SELECT name INTO product_name FROM public.products WHERE id=o.product_id;
 INSERT INTO public.expenses(description,category,amount,expense_date,created_by,stock_order_id) VALUES('Supplier payment: '||coalesce(supplier_name,'supplier')||' — '||coalesce(product_name,'product')||' x '||o.quantity,'Supplier payment',p_amount,(now() AT TIME ZONE 'Africa/Johannesburg')::date,auth.uid(),o.id) RETURNING id INTO expense_id;
 UPDATE public.stock_orders SET payment_status='paid',paid_amount=p_amount,paid_at=now(),paid_by=auth.uid(),payment_reference=nullif(trim(p_reference),'') WHERE id=o.id;
 RETURN expense_id;
END $$;
REVOKE ALL ON FUNCTION public.confirm_supplier_payment(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_supplier_payment(uuid,numeric,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_supplier_payment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.payment_status='paid' AND NOT EXISTS (SELECT 1 FROM public.expenses WHERE stock_order_id=NEW.id AND amount=NEW.paid_amount) THEN RAISE EXCEPTION 'Confirm payment through supplier checkout'; END IF;
 IF TG_OP='UPDATE' AND OLD.payment_status='paid' AND (NEW.payment_status IS DISTINCT FROM OLD.payment_status OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.paid_by IS DISTINCT FROM OLD.paid_by OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference) THEN RAISE EXCEPTION 'Recorded supplier payments cannot be changed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_supplier_payment BEFORE INSERT OR UPDATE ON public.stock_orders FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_payment();