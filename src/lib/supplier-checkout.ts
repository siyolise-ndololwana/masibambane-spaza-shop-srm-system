export function validateSupplierCheckoutUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.username || url.password || trimmed.length > 2048 || /\s/.test(trimmed)) {
      throw new Error("Invalid link");
    }
    return url.href;
  } catch {
    throw new Error("Enter a valid HTTPS supplier payment link without login details.");
  }
}