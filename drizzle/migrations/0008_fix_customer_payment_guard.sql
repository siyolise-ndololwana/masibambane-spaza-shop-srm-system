CREATE OR REPLACE FUNCTION public.guard_customer_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND NOT EXISTS (SELECT 1 FROM public.sales WHERE id = NEW.sale_id AND total_amount = NEW.paid_amount) THEN
    RAISE EXCEPTION 'Confirm payment through the customer order payment step';
  END IF;
  IF OLD.payment_status = 'paid' AND (
       NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.paid_by IS DISTINCT FROM OLD.paid_by
       OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
       OR NEW.sale_id IS DISTINCT FROM OLD.sale_id) THEN
    RAISE EXCEPTION 'A recorded customer payment cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;