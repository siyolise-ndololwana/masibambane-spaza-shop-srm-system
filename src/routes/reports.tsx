import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Monthly Reports — Masibambane Spaza" },
      { name: "description", content: "Monthly sales charts, top products and profit summary." },
      { property: "og:title", content: "Monthly Reports — Masibambane Spaza" },
      { property: "og:description", content: "Monthly sales charts, top products and profit summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user, loading } = useRequireAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data } = useQuery({
    queryKey: ["report", month],
    enabled: !!user,
    queryFn: async () => {
      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const [{ data: sales, error }, { data: ex }] = await Promise.all([
        supabase
          .from("sales")
          .select("sale_date, total_amount, sale_items(product_name, quantity, total_price)")
          .gte("sale_date", start.toISOString())
          .lt("sale_date", end.toISOString()),
        supabase
          .from("expenses")
          .select("amount")
          .gte("expense_date", start.toISOString().slice(0, 10))
          .lt("expense_date", end.toISOString().slice(0, 10)),
      ]);
      if (error) throw error;
      const days = end.getDate() === 1 ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() : 31;
      const daily = Array.from({ length: days }, (_, i) => ({ day: String(i + 1), total: 0 }));
      const prod = new Map<string, number>();
      let total = 0;
      for (const s of sales ?? []) {
        total += Number(s.total_amount);
        daily[new Date(s.sale_date).getDate() - 1].total += Number(s.total_amount);
        for (const it of s.sale_items) prod.set(it.product_name, (prod.get(it.product_name) ?? 0) + it.quantity);
      }
      const top = [...prod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const expenses = (ex ?? []).reduce((s, e) => s + Number(e.amount), 0);
      return { daily, top, total, count: sales?.length ?? 0, expenses };
    },
  });

  if (loading) return null;
  const label = new Date(`${month}-01`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Monthly report</h2>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 bg-surface" />
        </div>
        <div className="h-56 rounded-2xl border border-border bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} width={40} />
              <Tooltip formatter={(v: number) => rand(v)} />
              <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {data && (
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <p>
              In <b>{label}</b> the shop made <b>{data.count}</b> sales worth <b>{rand(data.total)}</b>, with
              expenses of <b>{rand(data.expenses)}</b>, leaving <b>{rand(data.total - data.expenses)}</b>.
            </p>
            {data.top.length > 0 && (
              <div>
                <p className="mb-1 font-semibold">Top sellers</p>
                {data.top.map(([n, q]) => (
                  <p key={n} className="flex justify-between text-xs">
                    <span>{n}</span>
                    <span>{q} sold</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
