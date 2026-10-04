import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortDate, shortTime } from "@/lib/format";

export const Route = createFileRoute("/sales/")({
  head: () => ({
    meta: [
      { title: "Sales History — Masibambane Spaza" },
      { name: "description", content: "All recorded sales with items and payment method." },
      { property: "og:title", content: "Sales History — Masibambane Spaza" },
      { property: "og:description", content: "All recorded sales with items and payment method." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { user, loading } = useRequireAuth();
  const { data } = useQuery({
    queryKey: ["sales"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, sale_date, total_amount, payment_method, sale_items(product_name, quantity)")
        .order("sale_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  if (loading) return null;
  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Sales</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {(data ?? []).map((s, i) => (
            <div key={s.id} className={`flex justify-between p-4 ${i ? "border-t border-border" : ""}`}>
              <div className="min-w-0 pr-3">
                <p className="truncate text-sm font-semibold">
                  {s.sale_items.map((it) => `${it.quantity}× ${it.product_name}`).join(", ") || "Sale"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {shortDate(s.sale_date)} {shortTime(s.sale_date)} • {s.payment_method}
                </p>
              </div>
              <p className="text-sm font-bold">{rand(s.total_amount)}</p>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No sales yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
