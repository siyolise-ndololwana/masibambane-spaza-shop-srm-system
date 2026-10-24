import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/supplier-ledger")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — Masibambane Spaza" },
      { name: "description", content: "Each supplier's orders, payments and outstanding balances." },
      { property: "og:title", content: "Supplier Ledger — Masibambane Spaza" },
      { property: "og:description", content: "Each supplier's orders, payments and outstanding balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupplierLedgerPage,
});

type Order = {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  payment_status: string;
  paid_amount: number | null;
  deadline: string;
  created_at: string;
  products: { name: string } | null;
  suppliers: { name: string } | null;
};

function SupplierLedgerPage() {
  const { user, loading } = useRequireAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["stock_orders"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_orders")
        .select("id, quantity, unit_price, status, payment_status, paid_amount, deadline, created_at, products(name), suppliers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
  if (loading) return null;

  const suppliers = new Map<string, { orders: Order[]; ordered: number; paid: number; outstanding: number }>();
  for (const o of orders ?? []) {
    const name = o.suppliers?.name ?? "No supplier";
    if (!suppliers.has(name)) suppliers.set(name, { orders: [], ordered: 0, paid: 0, outstanding: 0 });
    const s = suppliers.get(name)!;
    s.orders.push(o);
    if (o.status === "cancelled") continue;
    const total = o.quantity * Number(o.unit_price);
    s.ordered += total;
    if (o.payment_status === "paid") s.paid += Number(o.paid_amount ?? 0);
    else s.outstanding += total;
  }
  const list = [...suppliers.entries()]
    .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1].outstanding - a[1].outstanding);

  const totalOutstanding = list.reduce((t, [, s]) => t + s.outstanding, 0);
  const totalPaid = list.reduce((t, [, s]) => t + s.paid, 0);

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Supplier ledger</h2>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Still owed to suppliers</p>
            <p className="text-lg font-bold text-destructive">{rand(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Paid to suppliers</p>
            <p className="text-lg font-bold text-success">{rand(totalPaid)}</p>
          </div>
        </div>

        <Input placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-surface" />

        {list.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            No supplier orders yet. Place one on the <Link to="/orders" className="font-medium text-primary">Stock orders</Link> page.
          </p>
        )}

        {list.map(([name, s]) => (
          <div key={name} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <button
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
              onClick={() => setOpen(open === name ? null : name)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.orders.length} order{s.orders.length === 1 ? "" : "s"} • paid {rand(s.paid)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.outstanding > 0 ? (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    Owed {rand(s.outstanding)}
                  </span>
                ) : (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">Settled</span>
                )}
                {open === name ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </button>

            {open === name && (
              <div className="border-t border-border">
                {s.orders.map((o) => {
                  const total = o.quantity * Number(o.unit_price);
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 border-t border-border p-3 first:border-t-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{o.products?.name ?? "—"} × {o.quantity}</p>
                        <p className="text-xs text-muted-foreground">
                          {shortDate(o.created_at.slice(0, 10))} • due {shortDate(o.deadline)} • {o.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{rand(total)}</p>
                        <p className={`text-[10px] font-semibold ${o.payment_status === "paid" ? "text-success" : o.status === "cancelled" ? "text-muted-foreground" : "text-destructive"}`}>
                          {o.status === "cancelled" ? "Cancelled" : o.payment_status === "paid" ? `Paid ${rand(Number(o.paid_amount ?? 0))}` : "Unpaid"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Paid supplier amounts appear in the <Link to="/reports" className="font-medium text-primary">expense report</Link>; unpaid orders show there as outstanding stock order costs.
        </p>
      </div>
    </AppShell>
  );
}
