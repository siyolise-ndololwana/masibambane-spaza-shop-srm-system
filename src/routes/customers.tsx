import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customer Ledger — Masibambane Spaza" },
      { name: "description", content: "Each customer's orders, payments and outstanding balance." },
      { property: "og:title", content: "Customer Ledger — Masibambane Spaza" },
      { property: "og:description", content: "Each customer's orders, payments and outstanding balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

type Order = {
  id: string;
  customer_name: string;
  quantity: number;
  unit_price: number;
  status: string;
  payment_status: string;
  paid_amount: number | null;
  delivery_date: string;
  created_at: string;
  products: { name: string } | null;
};

function CustomersPage() {
  const { user, loading } = useRequireAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["customer_orders"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_orders")
        .select("id, customer_name, quantity, unit_price, status, payment_status, paid_amount, delivery_date, created_at, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
  if (loading) return null;

  const customers = new Map<string, { orders: Order[]; ordered: number; paid: number; outstanding: number }>();
  for (const o of orders ?? []) {
    const name = o.customer_name;
    if (!customers.has(name)) customers.set(name, { orders: [], ordered: 0, paid: 0, outstanding: 0 });
    const c = customers.get(name)!;
    c.orders.push(o);
    if (o.status === "cancelled") continue;
    const total = o.quantity * Number(o.unit_price);
    c.ordered += total;
    if (o.payment_status === "paid") c.paid += Number(o.paid_amount ?? 0);
    else c.outstanding += total;
  }
  const list = [...customers.entries()]
    .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[1].outstanding - a[1].outstanding);

  const totalOutstanding = list.reduce((t, [, c]) => t + c.outstanding, 0);
  const totalPaid = list.reduce((t, [, c]) => t + c.paid, 0);

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Customer ledger</h2>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Still owed to the shop</p>
            <p className="text-lg font-bold text-destructive">{rand(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-xs text-muted-foreground">Paid by customers</p>
            <p className="text-lg font-bold text-success">{rand(totalPaid)}</p>
          </div>
        </div>

        <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-surface" />

        {list.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            No customers yet. Take an order on the <Link to="/customer-orders" className="font-medium text-primary">Customer orders</Link> page.
          </p>
        )}

        {list.map(([name, c]) => (
          <div key={name} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <button
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
              onClick={() => setOpen(open === name ? null : name)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.orders.length} order{c.orders.length === 1 ? "" : "s"} • paid {rand(c.paid)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.outstanding > 0 ? (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    Owes {rand(c.outstanding)}
                  </span>
                ) : (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">Settled</span>
                )}
                {open === name ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </button>

            {open === name && (
              <div className="border-t border-border">
                {c.orders.map((o) => {
                  const total = o.quantity * Number(o.unit_price);
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-2 border-t border-border p-3 first:border-t-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{o.products?.name ?? "—"} × {o.quantity}</p>
                        <p className="text-xs text-muted-foreground">
                          {shortDate(o.created_at.slice(0, 10))} • deliver by {shortDate(o.delivery_date)}
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
          Paid amounts appear in the <Link to="/reports" className="font-medium text-primary">income (sales) report</Link>; supplier costs for stock appear in the expense report there too.
        </p>
      </div>
    </AppShell>
  );
}
