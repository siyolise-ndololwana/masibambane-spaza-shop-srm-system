import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Masibambane Spaza" },
      { name: "description", content: "Record and total shop expenses and stock purchases." },
      { property: "og:title", content: "Expenses — Masibambane Spaza" },
      { property: "og:description", content: "Record and total shop expenses and stock purchases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("General");
  const [amount, setAmount] = useState("");

  const { data } = useQuery({
    queryKey: ["expenses"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: ex, error }, { data: del }] = await Promise.all([
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("stock_deliveries").select("quantity, unit_cost"),
      ]);
      if (error) throw error;
      const purchases = (del ?? []).reduce((s, d) => s + d.quantity * Number(d.unit_cost), 0);
      return { ex: ex ?? [], purchases };
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("expenses")
        .insert({ description: desc.trim(), category: cat, amount: Number(amount), created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense saved");
      setDesc("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  const totalEx = (data?.ex ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Expenses</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Expenses" value={rand(totalEx)} />
          <Stat label="Stock purchases" value={rand(data?.purchases ?? 0)} />
        </div>
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <Input placeholder="Description (e.g. Electricity)" value={desc} maxLength={100} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Category" value={cat} maxLength={40} onChange={(e) => setCat(e.target.value)} />
            <Input type="number" step="0.01" placeholder="Amount (R)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!desc.trim() || !(Number(amount) > 0) || add.isPending} onClick={() => add.mutate()}>
            Add expense
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {(data?.ex ?? []).map((e, i) => (
            <div key={e.id} className={`flex justify-between p-4 ${i ? "border-t border-border" : ""}`}>
              <div>
                <p className="text-sm font-semibold">{e.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  {e.category} • {shortDate(e.expense_date)}
                </p>
              </div>
              <p className="text-sm font-bold">{rand(e.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
