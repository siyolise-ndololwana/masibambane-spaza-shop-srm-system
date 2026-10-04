import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { shortDate, shortTime } from "@/lib/format";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Stock Activity Log — Masibambane Spaza" },
      { name: "description", content: "Every stock quantity change: who, when and why." },
      { property: "og:title", content: "Stock Activity Log — Masibambane Spaza" },
      { property: "og:description", content: "Every stock quantity change: who, when and why." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user, loading } = useRequireAuth();
  const { data } = useQuery({
    queryKey: ["inventory_log"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: log, error }, { data: people }] = await Promise.all([
        supabase.from("inventory_log").select("*").order("changed_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (error) throw error;
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return (log ?? []).map((l) => ({ ...l, who: l.changed_by ? names.get(l.changed_by) || "Staff" : "System" }));
    },
  });
  if (loading) return null;
  return (
    <AppShell>
      <div className="space-y-5">
        <h2 className="text-xl font-bold">Stock activity</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {(data ?? []).map((l, i) => (
            <div key={l.id} className={`flex justify-between p-4 ${i ? "border-t border-border" : ""}`}>
              <div className="min-w-0 pr-3">
                <p className="truncate text-sm font-semibold">{l.product_name}</p>
                <p className="text-xs">{l.reason}</p>
                <p className="text-[10px] text-muted-foreground">
                  {l.who} • {shortDate(l.changed_at)} {shortTime(l.changed_at)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${l.change < 0 ? "text-destructive" : "text-success"}`}>
                  {l.change > 0 ? "+" : ""}
                  {l.change}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {l.old_quantity} → {l.new_quantity}
                </p>
              </div>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No stock changes yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
