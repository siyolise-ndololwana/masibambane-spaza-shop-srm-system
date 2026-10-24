import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rand, shortDate } from "@/lib/format";
import { validateSupplierCheckoutUrl } from "@/lib/supplier-checkout";

export const Route = createFileRoute("/orders_/$orderId/checkout")({
  head: () => ({ meta: [
    { title: "Supplier Checkout — Masibambane Spaza" },
    { name: "description", content: "Review your stock order and open its supplier payment page." },
    { property: "og:title", content: "Supplier Checkout — Masibambane Spaza" },
    { property: "og:description", content: "Review your stock order and open its supplier payment page." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SupplierCheckoutPage,
});

function SupplierCheckoutPage() {
  const { orderId } = Route.useParams();
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState("");
  const query = useQuery({
    queryKey: ["supplier-checkout", orderId], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_orders")
        .select("*, products(name), suppliers(name, contact_person, phone, email)").eq("id", orderId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const order = query.data;
  const linkStorageReady = !!order && "checkout_url" in order;
  const storedValue = order && "checkout_url" in order ? order.checkout_url : null;
  const savedUrl = typeof storedValue === "string" ? storedValue : "";
  let safeUrl: string | null = null;
  try { safeUrl = validateSupplierCheckoutUrl(savedUrl); } catch { /* Never open invalid stored URLs. */ }
  useEffect(() => { setUrl(savedUrl); }, [savedUrl, orderId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order || order.status === "cancelled" || !linkStorageReady) return;
    let checkoutUrl: string | null;
    try { checkoutUrl = validateSupplierCheckoutUrl(url); }
    catch (error) { setValidation((error as Error).message); return; }
    setValidation("");
    setBusy(true);
    try {
      const update: TablesUpdate<"stock_orders"> = { checkout_url: checkoutUrl };
      const { data, error } = await supabase.from("stock_orders").update(update)
        .eq("id", order.id).neq("status", "cancelled").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("The order was cancelled or is no longer available.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["supplier-checkout", orderId] }),
        qc.invalidateQueries({ queryKey: ["stock_orders"] }),
      ]);
      toast.success(checkoutUrl ? "Supplier payment link saved" : "Supplier payment link removed");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  };

  if (loading) return null;
  return <AppShell>
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/orders"><ArrowLeft />Stock orders</Link></Button>
      <h2 className="text-3xl font-semibold">Supplier checkout</h2>
      {query.isPending && <p className="text-sm text-muted-foreground">Loading order…</p>}
      {query.isError && <div role="alert" className="space-y-3"><p className="text-destructive">Could not load this order. Please try again.</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div>}
      {!query.isPending && !query.isError && !order && <p>Order not found.</p>}
      {order && <>
        <section className="space-y-4 border-b border-border pb-5">
          <div><p className="text-xs text-muted-foreground">Supplier</p><h3 className="text-xl font-semibold">{order.suppliers?.name ?? "No supplier"}</h3>
            <p className="break-words text-sm text-muted-foreground">{[order.suppliers?.contact_person, order.suppliers?.phone, order.suppliers?.email].filter(Boolean).join(" • ")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 overflow-hidden rounded-lg"><ProductImage name={order.products?.name ?? "Product"} /></div>
            <div className="min-w-0"><p className="font-semibold">{order.products?.name ?? "Product"}</p><p className="text-sm text-muted-foreground">{order.quantity} × {rand(Number(order.unit_price))}</p></div>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Order total</dt><dd className="text-2xl font-semibold">{rand(order.quantity * Number(order.unit_price))}</dd></div>
            <div><dt className="text-muted-foreground">Delivery deadline</dt><dd>{shortDate(order.deadline)}</dd></div>
            <div><dt className="text-muted-foreground">Order reference</dt><dd className="break-all">{order.id}</dd></div>
            <div><dt className="text-muted-foreground">Delivery status</dt><dd className="capitalize">{order.status}</dd></div>
          </dl>
        </section>
        {order.status === "cancelled" ? <p className="text-muted-foreground">This order is cancelled. Checkout is unavailable.</p> : <>
          {!linkStorageReady && <p role="status" className="text-sm text-warning">Payment link saving is waiting for Lovable Cloud to finish starting. Please try again later.</p>}
          <form onSubmit={save} className="space-y-3">
            <label htmlFor="supplier-payment-url" className="flex items-center gap-2 text-sm font-semibold"><Link2 />Supplier payment link</label>
            <Input id="supplier-payment-url" type="text" inputMode="url" placeholder="https://" maxLength={2048} value={url} disabled={busy || !linkStorageReady} onChange={(event) => { setUrl(event.target.value); setValidation(""); }} aria-invalid={!!validation} aria-describedby={validation ? "checkout-error" : undefined} />
            {validation && <p id="checkout-error" role="alert" className="text-sm text-destructive">{validation}</p>}
            <Button type="submit" variant="outline" disabled={busy || !linkStorageReady || url.trim() === savedUrl}><Save />{busy ? "Saving…" : "Save payment link"}</Button>
          </form>
          {safeUrl && <div className="space-y-3 border-t border-border pt-4">
            <p className="break-all text-sm text-muted-foreground">Payment page: {new URL(safeUrl).hostname}</p>
            <p className="text-sm text-muted-foreground">Check the supplier, order reference and final amount before paying. Payment is confirmed by the supplier, not this shop.</p>
            <Button asChild><a href={safeUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink />Open supplier payment page</a></Button>
          </div>}
          <p className="text-xs text-muted-foreground">The order total stays in expense reports. Opening checkout does not confirm payment or receive stock.</p>
        </>}
        {order.status === "received" && <Button asChild variant="link"><Link to="/activity">View stock activity →</Link></Button>}
      </>}
    </div>
  </AppShell>;
}