ALTER TABLE public.customer_orders
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  ADD COLUMN paid_amount NUMERIC,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN paid_by UUID,
  ADD COLUMN payment_reference TEXT,
  ADD COLUMN sale_id UUID REFERENCES public.sales(id);

-- When payment is confirmed a sale is recorded, and the sale item already deducts stock,
-- so the completion trigger must skip orders that were completed through a payment.
CREATE OR REPLACE FUNCTION public.complete_customer_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.sale_id IS NULL THEN
    NEW.completed_at := now();
    PERFORM set_config('app.stock_reason', 'Customer order for ' || NEW.customer_name, true);
    UPDATE public.products
      SET quantity = quantity - NEW.quantity
      WHERE id = NEW.product_id;
  ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_customer_payment(p_order_id uuid, p_amount numeric, p_reference text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.customer_orders%ROWTYPE;
  v_sale_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  SELECT * INTO o FROM public.customer_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF o.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is cancelled';
  END IF;
  IF o.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  INSERT INTO public.sales (user_id, total_amount, payment_method)
  VALUES (auth.uid(), p_amount, o.payment_method)
  RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
  SELECT v_sale_id, o.product_id, p.name, o.quantity, o.unit_price, p_amount
  FROM public.products p WHERE p.id = o.product_id;

  UPDATE public.customer_orders
  SET payment_status = 'paid',
      paid_amount = p_amount,
      paid_at = now(),
      paid_by = auth.uid(),
      payment_reference = nullif(p_reference, ''),
      sale_id = v_sale_id,
      status = 'completed'
  WHERE id = o.id;

  RETURN v_sale_id;
END;
$$;

-- Payment fields may only change through confirm_customer_payment.
CREATE OR REPLACE FUNCTION public.guard_customer_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.payment_status = 'paid' THEN
    RAISE EXCEPTION 'A recorded customer payment cannot be changed';
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
    RAISE EXCEPTION 'Use confirm_customer_payment to record a payment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_payment_guard
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_customer_payment();