import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSalesInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to) || input.from > input.to)
      throw new Error("Choose a valid date range.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const end = new Date(`${data.to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const sb = context.supabase;
    const [sales, expenses, products] = await Promise.all([
      sb.from("sales").select("sale_date, total_amount, payment_method, sale_items(product_name, quantity, total_price)")
        .gte("sale_date", `${data.from}T00:00:00Z`).lt("sale_date", end.toISOString()),
      sb.from("expenses").select("category, amount").gte("expense_date", data.from).lte("expense_date", data.to),
      sb.from("products").select("name, quantity, reorder_level, selling_price, cost_price"),
    ]);
    if (sales.error) throw new Error(sales.error.message);
    const daily: Record<string, number> = {};
    const pay: Record<string, number> = {};
    const prod: Record<string, { qty: number; income: number }> = {};
    let total = 0;
    for (const s of sales.data ?? []) {
      const t = Number(s.total_amount);
      total += t;
      const d = s.sale_date.slice(0, 10);
      daily[d] = (daily[d] ?? 0) + t;
      pay[s.payment_method] = (pay[s.payment_method] ?? 0) + t;
      for (const i of s.sale_items) {
        const p = (prod[i.product_name] ??= { qty: 0, income: 0 });
        p.qty += i.quantity;
        p.income += Number(i.total_price);
      }
    }
    const exp: Record<string, number> = {};
    for (const e of expenses.data ?? []) exp[e.category] = (exp[e.category] ?? 0) + Number(e.amount);
    const facts = {
      period: `${data.from} to ${data.to}`,
      sales_count: sales.data?.length ?? 0,
      total_sales_rand: Math.round(total * 100) / 100,
      daily_sales_rand: daily,
      by_payment_method_rand: pay,
      products_sold: prod,
      expenses_by_category_rand: exp,
      current_stock: (products.data ?? []).map((p) => ({
        name: p.name, qty: p.quantity, reorder_at: p.reorder_level,
        margin_rand: Number(p.selling_price) - Number(p.cost_price),
      })),
    };
    if (!facts.sales_count) return { summary: "There were no sales in this period, so there is nothing to analyse yet.", facts };
    const { summarizeWithAI } = await import("./gateway.server");
    const summary = await summarizeWithAI(
      "You advise the owner of a small South African spaza shop. Use only the data given. Write in plain, friendly English for non-technical staff, amounts in Rand (R). Format: a short 'Summary' paragraph, then 'Trends' (3-5 bullets), then 'Suggested actions' (3-5 practical bullets, e.g. restock, pricing, cost cuts). Keep it under 250 words. No markdown headings symbols other than '-' bullets; put section names on their own line.",
      JSON.stringify(facts),
    );
    return { summary, facts };
  });
