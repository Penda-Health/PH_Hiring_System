import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type ProviderId = "llama" | "gemini" | "cloudflare";

export type ProviderDefinition = {
  id: ProviderId;
  label: string;
  description: string;
  getModel: () => LanguageModel;
};

// Each `getModel` is only called once a chat request actually picks that
// provider, so a missing env var for one provider doesn't break the others.
export const AI_PROVIDERS: ProviderDefinition[] = [
  {
    id: "llama",
    label: "GPT-OSS 120B (Groq)",
    // Was Llama 3.3 70B — Groq deprecated it (and llama-3.1-8b-instant) on
    // the free/developer tier on 2026-06-17, recommending openai/gpt-oss-120b
    // as the replacement for the 70B-class model. Same GROQ_API_KEY, same
    // free tier — just a different model string.
    description: "Fast, free-tier Groq-hosted GPT-OSS 120B.",
    getModel: () => createGroq({ apiKey: process.env.GROQ_API_KEY })("openai/gpt-oss-120b"),
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "Google's free-tier Gemini Flash.",
    // Was gemini-2.0-flash — Google retired it (404 "no longer available"),
    // and 2.5-flash is closed to new users. Pinned to 3.5-flash rather than
    // `gemini-flash-latest`, which aliases to the newest model and was
    // returning 503 "high demand" when this was changed (2026-10-16).
    getModel: () =>
      createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })("gemini-3.5-flash"),
  },
  {
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    description: "Open-weight models on Cloudflare's free tier.",
    getModel: () => {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      // Was @cf/meta/llama-3.1-8b-instruct — Cloudflare deprecated it on
      // 2026-05-30 (HTTP 410).
      return createOpenAICompatible({
        name: "cloudflare-workers-ai",
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
        apiKey: process.env.CLOUDFLARE_API_TOKEN,
      })("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    },
  },
];

export function getProvider(id: string): ProviderDefinition {
  const provider = AI_PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}
