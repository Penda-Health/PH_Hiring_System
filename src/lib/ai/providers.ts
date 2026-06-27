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
    label: "Llama 3.3 (Groq)",
    description: "Fast, free-tier Groq-hosted Llama 3.3 70B.",
    getModel: () => createGroq({ apiKey: process.env.GROQ_API_KEY })("llama-3.3-70b-versatile"),
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "Google's free-tier Gemini Flash.",
    getModel: () =>
      createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })("gemini-2.0-flash"),
  },
  {
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    description: "Open-weight models on Cloudflare's free tier.",
    getModel: () => {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      return createOpenAICompatible({
        name: "cloudflare-workers-ai",
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
        apiKey: process.env.CLOUDFLARE_API_TOKEN,
      })("@cf/meta/llama-3.1-8b-instruct");
    },
  },
];

export function getProvider(id: string): ProviderDefinition {
  const provider = AI_PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}
