import { useMemo, useState } from "react";
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
import { ProductImage } from "@/components/ProductImage";
import { ConfirmRecord } from "@/components/ConfirmRecord";
import { FakePaymentGate } from "@/components/FakePaymentGate";

export const Route = createFileRoute("/till")({
  head: () => ({
    meta: [
      { title: "Till — Masibambane Spaza" },
      { name: "description", content: "Ring up cash, card and EFT sales on the till with live totals." },
      { property: "og:title", content: "Till — Masibambane Spaza" },
      { property: "og:description", content: "Ring up cash, card and EFT sales on the till with live totals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TillPage,
});

type P = { id: string; name: string; selling_price: number; quantity: number; reorder_level: number };

const QUICK_CASH = [10, 20, 50, 100, 200];

function TillPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState("Cash");
  const [tendered, setTendered] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

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

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart)
    .flatMap(([id, q]) => { const p = byId.get(id); return p ? [{ p, q }] : []; });
  const itemCount = lines.reduce((s, l) => s + l.q, 0);
  const total = lines.reduce((s, l) => s + l.q * Number(l.p.selling_price), 0);
  const tenderedNum = Number(tendered);
  const change = payment === "Cash" && tenderedNum > 0 ? tenderedNum - total : null;

  const setQty = (id: string, q: number) =>
    setCart((c) => {
      const max = byId.get(id)?.quantity ?? 0;
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = Math.min(q, max);
      return n;
    });

  const reset = () => { setCart({}); setTendered(""); setPayment("Cash"); };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in before recording a sale.");
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({ user_id: user.id, payment_method: payment, total_amount: total })
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
      setConfirmOpen(false);
      toast.success(`Sale saved — ${rand(total)}`);
      low.forEach((n) => toast.warning(`Low stock: ${n}`));
      qc.invalidateQueries();
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  const filtered = (products ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const charge = () => {
    if (payment === "Cash") {
      if (tenderedNum > 0 && tenderedNum < total) { toast.error("Cash given is less than the total."); return; }
      setConfirmOpen(true);
    } else {
      setGateOpen(true);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Product grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">Till</h2>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 max-w-56 bg-surface text-base" />
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
            {filtered.map((p) => {
              const inCart = cart[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  disabled={p.quantity === 0 || inCart >= p.quantity}
                  onClick={() => setQty(p.id, inCart + 1)}
                  className="relative flex flex-col items-stretch overflow-hidden rounded-xl border border-border bg-surface text-left active:scale-[0.97] disabled:opacity-40"
                >
                  <ProductImage name={p.name} />
                  <div className="p-2.5">
                    <p className="min-h-10 break-words text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="mt-1 text-base font-bold">{rand(p.selling_price)}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} left</p>
                  </div>
                  {inCart > 0 && (
                    <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {inCart}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart / totals panel */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Current sale</h3>
            {lines.length > 0 && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={reset}>Clear</Button>
            )}
          </div>

          <div className="mt-2 min-h-16 flex-1 space-y-1 overflow-y-auto">
            {lines.length === 0 && <p className="text-sm text-muted-foreground">Tap products to add them.</p>}
            {lines.map(({ p, q }) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-t border-border py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{q} × {rand(Number(p.selling_price))}</p>
                </div>
                <p className="w-20 text-right text-sm font-bold">{rand(q * Number(p.selling_price))}</p>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="size-9" onClick={() => setQty(p.id, q - 1)}><Minus className="size-4" /></Button>
                  <Button size="icon" variant="outline" className="size-9" onClick={() => setQty(p.id, q + 1)}><Plus className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="size-9" onClick={() => setQty(p.id, 0)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Live totals */}
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{itemCount} item{itemCount === 1 ? "" : "s"}</span>
              <span>Subtotal {rand(total)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-3xl font-bold text-primary">{rand(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Cash", "Card", "EFT"].map((m) => (
              <Button key={m} size="lg" variant={payment === m ? "default" : "outline"} className="h-12 text-base" onClick={() => setPayment(m)}>
                {m}
              </Button>
            ))}
          </div>

          {/* Cash tendered + change */}
          {payment === "Cash" && lines.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                {QUICK_CASH.map((v) => (
                  <Button key={v} size="sm" variant="outline" className="h-10 flex-1" onClick={() => setTendered(String(v))}>R{v}</Button>
                ))}
              </div>
              <label className="block text-xs font-medium">Cash given (R)
                <Input type="number" min={0} step="0.01" inputMode="decimal" className="h-12 text-lg" value={tendered} onChange={(e) => setTendered(e.target.value)} />
              </label>
              {change !== null && (
                <div className={`flex items-baseline justify-between rounded-xl px-3 py-2 ${change < 0 ? "bg-destructive/10" : "bg-success/10"}`}>
                  <span className="text-sm font-medium">Change due</span>
                  <span className={`text-2xl font-bold ${change < 0 ? "text-destructive" : "text-success"}`}>{rand(Math.max(change, 0))}</span>
                </div>
              )}
            </div>
          )}

          <Button size="lg" className="mt-4 h-14 w-full text-lg" disabled={lines.length === 0 || mutation.isPending} onClick={charge}>
            {mutation.isPending ? "Saving…" : payment === "Cash" ? `Charge ${rand(total)}` : `Charge ${rand(total)} by ${payment}`}
          </Button>
        </div>
      </div>

      <ConfirmRecord
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm cash sale"
        description={`Record ${itemCount} items for ${rand(total)} paid in cash${change !== null && change >= 0 && tenderedNum > 0 ? ` (change due ${rand(change)})` : ""}? Stock and the activity log will be updated.`}
        pending={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
      <FakePaymentGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        amount={total}
        onPaid={(reference) => {
          toast.success(`Payment approved (${reference})`);
          mutation.mutate();
        }}
      />
    </AppShell>
  );
}
