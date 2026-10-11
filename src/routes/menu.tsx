import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, ShieldCheck, ClipboardList, History, LogOut, Truck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Masibambane Spaza" },
      { name: "description", content: "Reports, expenses, suppliers and stock activity." },
      { property: "og:title", content: "Menu — Masibambane Spaza" },
      { property: "og:description", content: "Reports, expenses, suppliers and stock activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

const items = [
  { to: "/reports", label: "Monthly reports", desc: "Sales charts and summary", icon: BarChart3 },
  { to: "/orders", label: "Stock orders", desc: "Order from suppliers with deadlines", icon: ClipboardList },
  { to: "/activity", label: "Stock activity log", desc: "Who changed stock, when and why", icon: History },
  { to: "/expenses", label: "Expenses", desc: "Record and total shop costs", icon: Wallet },
  { to: "/suppliers", label: "Suppliers", desc: "Orders, pending deliveries and costs", icon: Truck },
  { to: "/security", label: "Two-step verification", desc: "Protect your login with an authenticator app", icon: ShieldCheck },
] as const;

function MenuPage() {
  const { loading } = useRequireAuth();
  const navigate = useNavigate();
  if (loading) return null;
  return (
    <AppShell>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Menu</h2>
        {items.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-destructive"
        >
          <LogOut className="size-5" /> <span className="text-sm font-semibold">Sign out</span>
        </button>
      </div>
    </AppShell>
  );
}
