import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { rand, shortDate } from "@/lib/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Masibambane Spaza" },
      { name: "description", content: "Suppliers, their orders, pending deliveries and order costs." },
      { property: "og:title", content: "Suppliers — Masibambane Spaza" },
      { property: "og:description", content: "Suppliers, their orders, pending deliveries and order costs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", contact_person: "", phone: "" });
  const { data } = useQuery({
    queryKey: ["suppliers"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data, error }, { data: orders }] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase
          .from("stock_orders")
          .select("id, supplier_id, quantity, unit_price, deadline, status, created_at, products(name)")
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      return data.map((sup) => ({ ...sup, orders: (orders ?? []).filter((o) => o.supplier_id === sup.id) }));
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert({
        name: f.name.trim(),
        contact_person: f.contact_person.trim() || null,
        phone: f.phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier added");
      setF({ name: "", contact_person: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (loading) return null;
  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Suppliers</h2>
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <Input placeholder="Supplier name" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Contact person" maxLength={100} value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} />
            <Input placeholder="Phone" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <Button className="w-full" disabled={!f.name.trim() || add.isPending} onClick={() => add.mutate()}>
            Add supplier
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {(data ?? []).map((s, i) => {
            const today = new Date().toISOString().slice(0, 10);
            const cost = (o: { quantity: number; unit_price: number }) => o.quantity * Number(o.unit_price);
            const pending = s.orders.filter((o) => o.status === "pending");
            const spent = s.orders.filter((o) => o.status !== "cancelled").reduce((t, o) => t + cost(o), 0);
            return (
              <details key={s.id} className={`p-4 ${i ? "border-t border-border" : ""}`}>
                <summary className="cursor-pointer list-none">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.contact_person, s.phone, s.email].filter(Boolean).join(" • ") || "No contact details"}
                  </p>
                  <p className="mt-1 text-xs">
                    {s.orders.length} orders • {pending.length} pending ({rand(pending.reduce((t, o) => t + cost(o), 0))}) • total {rand(spent)}
                  </p>
                </summary>
                <div className="mt-3 space-y-2">
                  {s.orders.map((o) => {
                    const late = o.status === "pending" && o.deadline < today;
                    return (
                      <div key={o.id} className="flex justify-between gap-2 rounded-lg bg-muted p-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{o.products?.name ?? "—"} × {o.quantity}</p>
                          <p className="text-muted-foreground">Ordered {shortDate(o.created_at)} • due {shortDate(o.deadline)}</p>
                          {o.status === "received" && (
                            <Link to="/activity" className="font-medium text-primary">View in activity log →</Link>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{rand(cost(o))}</p>
                          <p className={late ? "text-destructive" : o.status === "received" ? "text-success" : "text-muted-foreground"}>
                            {late ? "Overdue" : o.status[0]!.toUpperCase() + o.status.slice(1)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {s.orders.length === 0 && <p className="text-xs text-muted-foreground">No orders yet.</p>}
                  <Link to="/orders" className="block text-xs font-medium text-primary">Place an order →</Link>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
