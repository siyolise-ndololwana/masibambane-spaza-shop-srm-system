import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Package, Receipt, Menu as MenuIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useCurrentStaff() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      const name = profile?.full_name?.trim() || (user!.email ?? "Staff");
      const role = roles?.some((r) => r.role === "owner") ? "Shop Owner" : "Cashier";
      return { name, role, isOwner: role === "Shop Owner" };
    },
  });
}

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/stock", label: "Stock", icon: Package },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/menu", label: "Menu", icon: MenuIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: staff } = useCurrentStaff();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Masibambane
          </h1>
          <p className="text-lg font-bold leading-none text-primary">Spaza Pro</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium">{staff?.name ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">{staff?.role ?? "Staff"}</p>
          </div>
          <div className="grid size-10 place-items-center rounded-full border border-border bg-secondary font-bold text-primary">
            {initials(staff?.name ?? "")}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-32">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-end justify-between px-6 py-3 pb-6">
          {navItems.slice(0, 2).map((item) => (
            <NavButton key={item.to} {...item} active={pathname === item.to} />
          ))}

          <Link
            to="/sales/new"
            className="-translate-y-4 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95"
            aria-label="Record a sale"
          >
            <Plus className="size-6" />
          </Link>

          {navItems.slice(2).map((item) => (
            <NavButton key={item.to} {...item} active={pathname.startsWith(item.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          active ? "bg-accent" : "bg-transparent",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
