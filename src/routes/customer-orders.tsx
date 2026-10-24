import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmRecord } from "@/components/ConfirmRecord";

export const Route = createFileRoute("/customer-orders")({
  head: () => ({
    meta: [
      { title: "Customer Orders — Masibambane Spaza" },
      { name: "description", content: "Take customer orders with quantities, payment method and delivery date." },
      { property: "og:title", content: "Customer Orders — Masibambane Spaza" },
      { property: "og:description", content: "Take customer orders with quantities, payment method and delivery date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerOrdersPage,
});

function CustomerOrdersPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer_name: "", product_id: "", quantity: "", unit_price: "", payment_method: "Cash", delivery_date: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", reference: "" });
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["customer_orders"],
    enabled: !!user,
    queryFn: async () => {
      const [o, p] = await Promise.all([
        supabase
          .from("customer_orders")
          .select("*, products(name)")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, selling_price, quantity").order("name"),
      ]);
      if (o.error) throw o.error;
      return { orders: o.data ?? [], products: p.data ?? [] };
    },
  });
  if (loading) return null;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.customer_name.trim() !== "" &&
    form.product_id !== "" &&
    form.delivery_date !== "" &&
    Number(form.quantity) > 0 &&
    Number(form.unit_price) >= 0;

  const place = async () => {
    setConfirmOpen(false);
    setBusy(true);
    const { error } = await supabase.from("customer_orders").insert({
      customer_name: form.customer_name.trim(),
      product_id: form.product_id,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
      payment_method: form.payment_method,
      delivery_date: form.delivery_date,
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer order saved");
    setForm({ customer_name: "", product_id: "", quantity: "", unit_price: "", payment_method: "Cash", delivery_date: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["customer_orders"] });
  };

  const setStatus = async (id: string, status: "completed" | "cancelled") => {
    const { error } = await supabase.from("customer_orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "completed" ? "Order completed and stock updated in the activity log" : "Order cancelled");
    qc.invalidateQueries();
  };

  const today = new Date().toISOString().slice(0, 10);
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Customer orders</h2>
        {data && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Pending orders value</p>
              <p className="text-lg font-bold">{rand(data.orders.filter((o) => o.status === "pending").reduce((t, o) => t + o.quantity * Number(o.unit_price), 0))}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Completed orders value</p>
              <p className="text-lg font-bold">{rand(data.orders.filter((o) => o.status === "completed").reduce((t, o) => t + o.quantity * Number(o.unit_price), 0))}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) { toast.error("Fill in customer, product, quantity, price and delivery date."); return; }
            setConfirmOpen(true);
          }}
          className="space-y-2 rounded-2xl border border-border bg-surface p-4"
        >
          <p className="text-sm font-semibold">Take a new customer order</p>
          <Input placeholder="Customer name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} maxLength={100} />
          <select
            className={sel}
            value={form.product_id}
            onChange={(e) => {
              const p = data?.products.find((x) => x.id === e.target.value);
              setForm((f) => ({ ...f, product_id: e.target.value, unit_price: p ? String(p.selling_price) : f.unit_price }));
            }}
          >
            <option value="">Choose product</option>
            {data?.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">Quantity<Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></label>
            <label className="text-xs">Unit price (R)<Input type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} /></label>
            <label className="text-xs">Delivery date<Input type="date" min={today} value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} /></label>
          </div>
          <select className={sel} value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="EFT">EFT</option>
          </select>
          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={200} />
          {Number(form.quantity) > 0 && (
            <p className="text-xs text-muted-foreground">Order total: {rand(Number(form.quantity) * Number(form.unit_price || 0))}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save order"}</Button>
        </form>

        <ConfirmRecord
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Save this customer order?"
          description={`${form.customer_name} — ${Number(form.quantity)} × ${rand(Number(form.unit_price || 0))}, ${form.payment_method}, delivery ${form.delivery_date}. Total ${rand(Number(form.quantity) * Number(form.unit_price || 0))}.`}
          pending={busy}
          onConfirm={place}
        />

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {data?.orders.map((o, i) => {
            const late = o.status === "pending" && o.delivery_date < today;
            return (
              <div key={o.id} className={`space-y-2 p-4 ${i ? "border-t border-border" : ""}`}>
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.customer_name} — {o.products?.name ?? "—"} × {o.quantity}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.payment_method} • {o.quantity} @ {rand(Number(o.unit_price))} • deliver by {shortDate(o.delivery_date)}
                    </p>
                    {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{rand(o.quantity * Number(o.unit_price))}</p>
                    <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      o.status === "completed" ? "bg-success/15 text-success"
                      : o.status === "cancelled" ? "bg-muted text-muted-foreground"
                      : late ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                      {late ? "Overdue" : o.status === "pending" ? "Pending" : o.status === "completed" ? "Completed" : "Cancelled"}
                    </span>
                  </div>
                </div>
                {o.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setStatus(o.id, "completed")}>Mark completed</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelled")}>Cancel</Button>
                  </div>
                )}
                {o.status === "completed" && (
                  <Link to="/activity" className="text-xs font-medium text-primary">View in stock activity log →</Link>
                )}
              </div>
            );
          })}
          {data?.orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No customer orders yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
