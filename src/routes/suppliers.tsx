import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
      { name: "description", content: "Supplier names and contact details." },
      { property: "og:title", content: "Suppliers — Masibambane Spaza" },
      { property: "og:description", content: "Supplier names and contact details." },
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
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
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
          {(data ?? []).map((s, i) => (
            <div key={s.id} className={`p-4 ${i ? "border-t border-border" : ""}`}>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {[s.contact_person, s.phone, s.email].filter(Boolean).join(" • ") || "No contact details"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
