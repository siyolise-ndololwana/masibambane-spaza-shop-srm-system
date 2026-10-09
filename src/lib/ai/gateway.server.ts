import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID = "X-Lovable-AIG-Run-ID";

export async function summarizeWithAI(instructions: string, prompt: string) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured for this app.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID) ?? undefined;
      return res;
    },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: instructions,
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure || !text.trim()) {
    const e = failure as { statusCode?: number; message?: string } | undefined;
    if (e?.statusCode === 429) throw new Error("AI is busy right now. Please try again in a minute.");
    if (e?.statusCode === 402) throw new Error("AI credits have run out. Add credits to keep using AI summaries.");
    throw new Error(e?.message || "The AI could not produce a summary.");
  }
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
}
