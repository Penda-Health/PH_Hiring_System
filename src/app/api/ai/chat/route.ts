import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getProvider } from "@/lib/ai/providers";
import { aiTools } from "@/lib/ai/tools";
import { buildSystemPrompt, type AiContext } from "@/lib/ai/build-context";

export const runtime = "nodejs";

// Auth is already enforced for every /api/* route by src/middleware.ts (must
// be a signed-in, domain-matched user). This route makes no recruitment-data
// mutations itself — tool calls are proposals the client confirms and
// applies via the existing guarded mutators — so it doesn't need to join
// RECRUITMENT_DATA_API_PREFIXES.
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

  const result = streamText({
    model: provider.getModel(),
    system: buildSystemPrompt(context, canEdit),
    messages: await convertToModelMessages(messages, { tools: aiTools }),
    tools: aiTools,
  });

  return result.toUIMessageStreamResponse();
}
