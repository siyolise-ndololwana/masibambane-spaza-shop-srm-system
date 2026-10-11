import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Two-step Verification — Masibambane Spaza" },
      { name: "description", content: "Protect your staff login with an authenticator app code." },
      { property: "og:title", content: "Two-step Verification — Masibambane Spaza" },
      { property: "og:description", content: "Protect your staff login with an authenticator app code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [setup, setSetup] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: factor } = useQuery({
    queryKey: ["mfa-factor"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp.find((f) => f.status === "verified") ?? null;
    },
  });
  if (loading) return null;

  const start = async () => {
    setBusy(true);
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Spaza ${Date.now()}` });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const confirm = async () => {
    if (!setup) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: setup.id, code: code.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-step verification is on");
    setSetup(null);
    setCode("");
    qc.invalidateQueries({ queryKey: ["mfa-factor"] });
  };
  const turnOff = async () => {
    if (!factor) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Two-step verification turned off");
    qc.invalidateQueries({ queryKey: ["mfa-factor"] });
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Two-step verification</h2>
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          {factor ? (
            <>
              <p className="font-semibold text-success">On — you'll be asked for a code each time you sign in.</p>
              <Button variant="outline" onClick={turnOff}>Turn off</Button>
            </>
          ) : setup ? (
            <>
              <p>1. Scan this with Google Authenticator or Microsoft Authenticator.</p>
              <img src={setup.qr} alt="Authenticator QR code" className="mx-auto size-48 rounded-lg bg-background p-2" />
              <p className="break-all text-xs text-muted-foreground">Or type this key: {setup.secret}</p>
              <p>2. Enter the 6-digit code it shows.</p>
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              <Button className="w-full" disabled={busy || code.trim().length !== 6} onClick={confirm}>Turn on</Button>
            </>
          ) : (
            <>
              <p>Add a second step to your login: after your password, you'll enter a code from an authenticator app on your phone.</p>
              <Button className="w-full" disabled={busy} onClick={start}>Set up two-step verification</Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
