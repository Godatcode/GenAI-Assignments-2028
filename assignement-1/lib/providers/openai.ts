import OpenAI from "openai";
import type { ChatProvider, StreamArgs } from "./types";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const openaiProvider: ChatProvider = {
  id: "openai",
  async stream({ systemPrompt, messages }: StreamArgs) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  },
};
