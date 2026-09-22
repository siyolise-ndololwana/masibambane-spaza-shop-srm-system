import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortTime } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shop Dashboard — Masibambane Spaza" },
      {
        name: "description",
        content:
          "Daily takings, low-stock alerts and the latest sales for Masibambane Spaza Shop.",
      },
      { property: "og:title", content: "Shop Dashboard — Masibambane Spaza" },
      {
        property: "og:description",
        content:
          "Daily takings, low-stock alerts and the latest sales for Masibambane Spaza Shop.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useRequireAuth();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    enabled: !!user,
    queryFn: async () => {
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);

      const [sales, products, recent] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount, sale_date")
          .gte("sale_date", startYesterday.toISOString()),
        supabase
          .from("products")
          .select("id, name, quantity, reorder_level, supplier_id, suppliers(name)")
          .order("quantity", { ascending: true }),
        supabase
          .from("sales")
          .select("id, total_amount, sale_date, payment_method")
          .order("sale_date", { ascending: false })
          .limit(5),
      ]);

      const rows = sales.data ?? [];
      const todayTotal = rows
        .filter((r) => new Date(r.sale_date) >= startToday)
        .reduce((s, r) => s + Number(r.total_amount), 0);
      const yesterdayTotal = rows
        .filter((r) => new Date(r.sale_date) < startToday)
        .reduce((s, r) => s + Number(r.total_amount), 0);
      const todayCount = rows.filter((r) => new Date(r.sale_date) >= startToday).length;
      const lowStock = (products.data ?? []).filter((p) => p.quantity <= p.reorder_level);

      return {
        todayTotal,
        todayCount,
        change:
          yesterdayTotal > 0
            ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
            : null,
        lowStock,
        recent: recent.data ?? [],
      };
    },
  });

  if (loading) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">Today's Sales</p>
            <p className="mt-1 text-xl font-bold">{rand(data?.todayTotal ?? 0)}</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-semibold text-success">
                {data?.change === null || data?.change === undefined
                  ? `${data?.todayCount ?? 0} sales today`
                  : `${data.change > 0 ? "+" : ""}${data.change}% vs yesterday`}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
            <div className="mt-1 flex items-baseline gap-1">
              <p className="text-xl font-bold text-destructive">{data?.lowStock.length ?? 0}</p>
              <p className="text-[10px] font-medium text-muted-foreground">items to reorder</p>
            </div>
            <Link
              to="/stock"
              className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-primary"
            >
              Order now
            </Link>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Stock Alerts</h2>
            <Link to="/stock" className="text-xs font-medium text-primary">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.lowStock ?? []).slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="flex items-center rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Supplier: {p.suppliers?.name ?? "Not set"}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      p.quantity === 0
                        ? "text-xs font-bold text-destructive"
                        : "text-xs font-bold text-warning"
                    }
                  >
                    {p.quantity} left
                  </p>
                  <p className="text-[10px] text-muted-foreground">Min: {p.reorder_level}</p>
                </div>
              </div>
            ))}
            {data && data.lowStock.length === 0 && (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                All products are above their reorder level.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold">Recent Sales</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {(data?.recent ?? []).map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-4 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold">Sale #{s.id.slice(0, 6).toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {shortTime(s.sale_date)} • {s.payment_method}
                  </p>
                </div>
                <p className="text-sm font-bold">{rand(s.total_amount)}</p>
              </div>
            ))}
            {data && data.recent.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No sales recorded yet. Tap the + button to record your first sale.
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
