import { PERSONA_PROMPTS } from "@/lib/personas";
import { resolveProvider } from "@/lib/providers";
import type { ChatMessage, PersonaId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: ChatMessage[];
  persona: PersonaId;
}

export async function POST(req: Request) {
  const { provider, reason } = resolveProvider();
  if (!provider) {
    return Response.json(
      { error: reason ?? "Server is not configured." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, persona } = body;

  if (!persona || !PERSONA_PROMPTS[persona]) {
    return Response.json({ error: "Unknown persona." }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages are required." }, { status: 400 });
  }

  const systemPrompt = PERSONA_PROMPTS[persona];

  try {
    const stream = await provider.stream({ systemPrompt, messages });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-LLM-Provider": provider.id,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Something went wrong calling the model.";
    console.error(`[/api/chat][${provider.id}]`, message);
    return Response.json(
      { error: "The model is unavailable right now. Please try again." },
      { status: 502 }
    );
  }
}
