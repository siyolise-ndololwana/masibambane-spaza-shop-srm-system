import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rand } from "@/lib/format";
import { processFakePayment, validateCard } from "@/lib/fake-gateway";

export function FakePaymentGate({ open, onOpenChange, amount, onPaid }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaid: (reference: string) => void;
}) {
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setCard(""); setExpiry(""); setCvv(""); setBusy(false); setError(null); };

  const pay = async () => {
    const problem = validateCard(card, expiry, cvv);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    const result = await processFakePayment(amount, card);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    const reference = result.reference;
    reset();
    onOpenChange(false);
    onPaid(reference);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) { onOpenChange(next); if (!next) reset(); } }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Card payment — {rand(amount)}</DialogTitle>
          <DialogDescription>
            Simulated gateway for demos and training. No real money moves and card details are never stored.
            Use 4242 4242 4242 4242 to approve, 4000 0000 0000 0002 to see a decline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs">Card number
            <Input inputMode="numeric" placeholder="4242 4242 4242 4242" value={card} onChange={(e) => setCard(e.target.value)} maxLength={23} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Expiry (MM/YY)
              <Input placeholder="12/28" value={expiry} onChange={(e) => setExpiry(e.target.value)} maxLength={5} />
            </label>
            <label className="text-xs">Security code
              <Input inputMode="numeric" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} maxLength={4} />
            </label>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy} onClick={pay}>
            {busy ? "Processing…" : `Pay ${rand(amount)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
