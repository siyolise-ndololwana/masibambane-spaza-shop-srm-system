import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/sales/new")({
  head: () => ({
    meta: [
      { title: "Record a Sale — Masibambane Spaza" },
      { name: "description", content: "Ring up a sale and update stock automatically." },
      { property: "og:title", content: "Record a Sale — Masibambane Spaza" },
      { property: "og:description", content: "Ring up a sale and update stock automatically." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewSalePage,
});

type P = { id: string; name: string; selling_price: number; quantity: number; reorder_level: number };

function NewSalePage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState("Cash");

  const { data: products } = useQuery({
    queryKey: ["products"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, selling_price, quantity, reorder_level")
        .order("name");
      if (error) throw error;
      return data as P[];
    },
  });

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const lines = Object.entries(cart)
    .map(([id, q]) => ({ p: byId.get(id)!, q }))
    .filter((l) => l.p);
  const total = lines.reduce((s, l) => s + l.q * Number(l.p.selling_price), 0);

  const setQty = (id: string, q: number) =>
    setCart((c) => {
      const max = byId.get(id)?.quantity ?? 0;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = Math.min(q, max);
      return n;
    });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({ user_id: user!.id, payment_method: payment, total_amount: total })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("sale_items").insert(
        lines.map((l) => ({
          sale_id: sale.id,
          product_id: l.p.id,
          product_name: l.p.name,
          quantity: l.q,
          unit_price: Number(l.p.selling_price),
          total_price: l.q * Number(l.p.selling_price),
        })),
      );
      if (e2) throw e2;
      return lines.filter((l) => l.p.quantity - l.q <= l.p.reorder_level).map((l) => l.p.name);
    },
    onSuccess: (low) => {
      toast.success(`Sale saved — ${rand(total)}`);
      low.forEach((n) => toast.warning(`Low stock: ${n}`));
      qc.invalidateQueries();
      navigate({ to: "/sales" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  const filtered = (products ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">New sale</h2>
        <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-surface" />
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              disabled={p.quantity === 0}
              onClick={() => setQty(p.id, (cart[p.id] ?? 0) + 1)}
              className="rounded-xl border border-border bg-surface p-3 text-left disabled:opacity-40"
            >
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {rand(p.selling_price)} • {p.quantity} left
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold">Cart</h3>
          {lines.length === 0 && <p className="text-sm text-muted-foreground">Tap a product to add it.</p>}
          {lines.map(({ p, q }) => (
            <div key={p.id} className="flex items-center justify-between border-t border-border py-2 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{rand(q * Number(p.selling_price))}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(p.id, q - 1)}>
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center text-sm font-bold">{q}</span>
                <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(p.id, q + 1)}>
                  <Plus className="size-3" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setQty(p.id, 0)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="mt-3 flex gap-2">
            {["Cash", "Card", "EFT"].map((m) => (
              <Button key={m} size="sm" variant={payment === m ? "default" : "outline"} onClick={() => setPayment(m)}>
                {m}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-lg font-bold">{rand(total)}</span>
            <Button disabled={lines.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
              Complete sale
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
