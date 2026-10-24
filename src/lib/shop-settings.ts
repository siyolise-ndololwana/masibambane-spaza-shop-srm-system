export const shopDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Hours = Record<string, { closed: boolean; opens: string; closes: string }>;
export const emptyHours = (): Hours => Object.fromEntries(shopDays.map(day => [day, { closed: false, opens: "", closes: "" }]));
export function validateHours(hours: Hours) {
  for (const day of shopDays) {
    const h = hours[day];
    if (!h || h.closed || (!h.opens && !h.closes)) continue;
    if (!/^\d{2}:\d{2}$/.test(h.opens) || !/^\d{2}:\d{2}$/.test(h.closes) || h.opens >= h.closes) throw new Error(`${day}: closing time must be after opening time.`);
  }
}
export function validatePaymentAmount(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new Error("Enter a positive amount with at most two decimal places.");
  return Number(value);
}
export function unrecordedOrderCosts<T extends { id: string }>(orders: T[], expenses: { stock_order_id: string | null }[]) {
  const paid = new Set(expenses.map(e => e.stock_order_id).filter(Boolean));
  return orders.filter(o => !paid.has(o.id));
}