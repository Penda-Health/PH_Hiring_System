import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getProvider } from "@/lib/ai/providers";
import { aiTools } from "@/lib/ai/tools";
import { buildSystemPrompt, type AiContext } from "@/lib/ai/build-context";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, providerId, context, canEdit } = body as {
    messages: UIMessage[];
    providerId: string;
    context: AiContext;
    canEdit: boolean;
  };

  let provider;
  try {
    provider = getProvider(providerId);
  } catch {
    return Response.json({ error: "Unknown AI provider." }, { status: 400 });
  }

  let model;
  try {
    model = provider.getModel();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initialize AI model";
    console.error(`[api/ai/chat] getModel (${providerId}) failed:`, err);
    return Response.json({ error: `${provider.label} is not configured: ${msg}` }, { status: 503 });
  }

  try {
    const result = streamText({
      model,
      system: buildSystemPrompt(context, canEdit),
      messages: await convertToModelMessages(messages, { tools: aiTools }),
      tools: aiTools,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw.includes("rate limit") || raw.includes("429")
      ? "Rate limit hit — wait a moment and try again."
      : raw.includes("401") || raw.includes("Unauthorized") || raw.includes("API key")
        ? `${provider.label} API key is missing or invalid.`
        : raw.includes("context length") || raw.includes("too long")
          ? "The request was too large for the model. Try a shorter conversation."
          : raw || "Something went wrong generating the response.";
    console.error(`[api/ai/chat] streamText (${providerId}) failed:`, err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
