// Simulated payment gateway for demos and training.
// No real money moves and no card details are stored or sent anywhere.

export type GatewayResult =
  | { ok: true; reference: string }
  | { ok: false; error: string };

export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function expiryValid(expiry: string, now = new Date()): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
}

export function cvvValid(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv.trim());
}

export function validateCard(cardNumber: string, expiry: string, cvv: string): string | null {
  if (!luhnValid(cardNumber)) return "Card number is not valid.";
  if (!expiryValid(expiry)) return "Expiry date is invalid or in the past.";
  if (!cvvValid(cvv)) return "Security code must be 3 or 4 digits.";
  return null;
}

// Test cards: 4242 4242 4242 4242 always approves; 4000 0000 0000 0002 always declines.
export async function processFakePayment(amount: number, cardNumber: string): Promise<GatewayResult> {
  await new Promise((r) => setTimeout(r, 1500));
  if (!(amount > 0)) return { ok: false, error: "Amount must be greater than zero." };
  const digits = cardNumber.replace(/\D/g, "");
  if (digits === "4000000000000002") return { ok: false, error: "Card declined by the (simulated) bank." };
  const reference = `SIM-${Date.now().toString(36).toUpperCase()}-${digits.slice(-4)}`;
  return { ok: true, reference };
}
