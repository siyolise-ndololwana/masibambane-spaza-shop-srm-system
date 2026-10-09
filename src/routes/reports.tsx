import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportCSV, exportPDF, type Cell } from "@/lib/export";

type Kind = "sales" | "expenses" | "orders";

async function buildReport(kind: Kind, from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const d = (iso: string) => new Date(iso).toLocaleDateString("en-ZA");
  const n = (v: number) => Number(v).toFixed(2);
  if (kind === "sales") {
    const { data, error } = await supabase
      .from("sales")
      .select("sale_date, payment_method, total_amount, sale_items(product_name, quantity, unit_price, total_price)")
      .gte("sale_date", start.toISOString())
      .lt("sale_date", end.toISOString())
      .order("sale_date");
    if (error) throw error;
    const rows: Cell[][] = [];
    let total = 0;
    for (const s of data ?? []) {
      total += Number(s.total_amount);
      for (const it of s.sale_items)
        rows.push([d(s.sale_date), it.product_name, it.quantity, n(it.unit_price), n(it.total_price), s.payment_method]);
    }
    return {
      title: "Monthly Sales Report",
      headers: ["Date", "Product", "Qty", "Unit price (R)", "Line total (R)", "Payment"],
      rows,
      summary: [`Sales: ${data?.length ?? 0}`, `Total sales: ${rand(total)}`],
    };
  }
  if (kind === "expenses") {
    const { data, error } = await supabase
      .from("expenses")
      .select("expense_date, description, category, amount")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date");
    if (error) throw error;
    const total = (data ?? []).reduce((s, e) => s + Number(e.amount), 0);
    return {
      title: "Monthly Expense Report",
      headers: ["Date", "Description", "Category", "Amount (R)"],
      rows: (data ?? []).map((e) => [d(e.expense_date), e.description, e.category, n(e.amount)]),
      summary: [`Total expenses: ${rand(total)}`],
    };
  }
  const { data, error } = await supabase
    .from("stock_deliveries")
    .select("date_received, quantity, unit_cost, products(name), suppliers(name)")
    .gte("date_received", start.toISOString())
    .lt("date_received", end.toISOString())
    .order("date_received");
  if (error) throw error;
  const total = (data ?? []).reduce((s, o) => s + o.quantity * Number(o.unit_cost), 0);
  return {
    title: "Stock Order Report",
    headers: ["Order date", "Supplier", "Product", "Qty", "Unit price (R)", "Total (R)"],
    rows: (data ?? []).map((o) => [
      d(o.date_received),
      o.suppliers?.name ?? "Not set",
      o.products?.name ?? "—",
      o.quantity,
      n(o.unit_cost),
      n(o.quantity * Number(o.unit_cost)),
    ]),
    summary: [`Orders: ${data?.length ?? 0}`, `Total spent on stock: ${rand(total)}`],
  };
}

function ExportPanel({ month }: { month: string }) {
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(`${month}-01`);
  const [to, setTo] = useState(() => {
    const [y, m] = month.split("-").map(Number);
    return `${month}-${String(new Date(y!, m!, 0).getDate()).padStart(2, "0")}`;
  });
  const label = `${new Date(from).toLocaleDateString("en-ZA")} – ${new Date(to).toLocaleDateString("en-ZA")}`;
  const run = async (kind: Kind, fmt: "pdf" | "csv") => {
    setBusy(true);
    try {
      if (from > to) throw new Error("Start date must be before end date");
      const r = await buildReport(kind, from, to);
      const file = `${kind}-report-${from}_to_${to}`;
      if (fmt === "csv") exportCSV(file, r.headers, r.rows);
      else await exportPDF(file, r.title, label, r.headers, r.rows, r.summary);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const items: { kind: Kind; name: string }[] = [
    { kind: "sales", name: "Sales" },
    { kind: "expenses", name: "Expenses" },
    { kind: "orders", name: "Stock orders" },
  ];
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold">Download reports</p>
      <div className="flex gap-2">
        <label className="flex-1 text-xs">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex-1 text-xs">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {items.map((it) => (
        <div key={it.kind} className="flex items-center justify-between">
          <span className="text-sm">{it.name}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(it.kind, "pdf")}>PDF</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(it.kind, "csv")}>CSV</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

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
        daily[new Date(s.sale_date).getDate() - 1]!.total += Number(s.total_amount);
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
        <ExportPanel key={month} month={month} />
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
