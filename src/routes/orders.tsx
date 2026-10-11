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

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Stock Orders — Masibambane Spaza" },
      { name: "description", content: "Place supplier orders with quantities, prices and deadlines." },
      { property: "og:title", content: "Stock Orders — Masibambane Spaza" },
      { property: "og:description", content: "Place supplier orders with quantities, prices and deadlines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ supplier_id: "", product_id: "", quantity: "", unit_price: "", deadline: "" });
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["stock_orders"],
    enabled: !!user,
    queryFn: async () => {
      const [o, p, s] = await Promise.all([
        supabase
          .from("stock_orders")
          .select("*, products(name), suppliers(name)")
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, cost_price").order("name"),
        supabase.from("suppliers").select("id, name").order("name"),
      ]);
      if (o.error) throw o.error;
      return { orders: o.data ?? [], products: p.data ?? [], suppliers: s.data ?? [] };
    },
  });
  if (loading) return null;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(form.quantity);
    const unit_price = Number(form.unit_price);
    if (!form.product_id || !form.supplier_id || !form.deadline || quantity <= 0 || unit_price < 0) {
      toast.error("Fill in supplier, product, quantity, price and deadline.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("stock_orders").insert({
      supplier_id: form.supplier_id,
      product_id: form.product_id,
      quantity,
      unit_price,
      deadline: form.deadline,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Order placed");
    setForm({ supplier_id: "", product_id: "", quantity: "", unit_price: "", deadline: "" });
    qc.invalidateQueries({ queryKey: ["stock_orders"] });
  };

  const setStatus = async (id: string, status: "received" | "cancelled") => {
    const { error } = await supabase.from("stock_orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "received" ? "Stock added and recorded in the activity log" : "Order cancelled");
    qc.invalidateQueries();
  };

  const today = new Date().toISOString().slice(0, 10);
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Stock orders</h2>
        {data && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Pending orders cost</p>
              <p className="text-lg font-bold">{rand(data.orders.filter((o) => o.status === "pending").reduce((t, o) => t + o.quantity * Number(o.unit_price), 0))}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Received orders cost</p>
              <p className="text-lg font-bold">{rand(data.orders.filter((o) => o.status === "received").reduce((t, o) => t + o.quantity * Number(o.unit_price), 0))}</p>
            </div>
          </div>
        )}
        <form onSubmit={place} className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold">Place a new order</p>
          <select className={sel} value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}>
            <option value="">Choose supplier</option>
            {data?.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            className={sel}
            value={form.product_id}
            onChange={(e) => {
              const p = data?.products.find((x) => x.id === e.target.value);
              setForm((f) => ({ ...f, product_id: e.target.value, unit_price: p ? String(p.cost_price) : f.unit_price }));
            }}
          >
            <option value="">Choose product</option>
            {data?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">Quantity<Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></label>
            <label className="text-xs">Unit price (R)<Input type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} /></label>
            <label className="text-xs">Deadline<Input type="date" min={today} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></label>
          </div>
          {Number(form.quantity) > 0 && (
            <p className="text-xs text-muted-foreground">Order total: {rand(Number(form.quantity) * Number(form.unit_price || 0))}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Placing…" : "Place order"}</Button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {data?.orders.map((o, i) => {
            const late = o.status === "pending" && o.deadline < today;
            return (
              <div key={o.id} className={`space-y-2 p-4 ${i ? "border-t border-border" : ""}`}>
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.products?.name ?? "—"} × {o.quantity}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.suppliers?.name ?? "No supplier"} • {o.quantity} @ {rand(Number(o.unit_price))} • due {shortDate(o.deadline)}
                    </p>
                  </div>
                  <div className="text-right">
                  <p className="text-sm font-bold">{rand(o.quantity * Number(o.unit_price))}</p>
                  <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    o.status === "received" ? "bg-success/15 text-success"
                    : o.status === "cancelled" ? "bg-muted text-muted-foreground"
                    : late ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                    {late ? "Overdue" : o.status === "pending" ? "Pending" : o.status === "received" ? "Received" : "Cancelled"}
                  </span>
                  </div>
                </div>
                {o.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setStatus(o.id, "received")}>Mark received</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelled")}>Cancel</Button>
                  </div>
                )}
                {o.status === "received" && (
                  <Link to="/activity" className="text-xs font-medium text-primary">View in stock activity log →</Link>
                )}
              </div>
            );
          })}
          {data?.orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No orders yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
