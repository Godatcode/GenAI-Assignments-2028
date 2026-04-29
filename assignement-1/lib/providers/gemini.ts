import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatProvider, StreamArgs } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const geminiProvider: ChatProvider = {
  id: "gemini",
  async stream({ systemPrompt, messages }: StreamArgs) {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

    // Gemini uses "model" instead of "assistant" for the bot role.
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = client.getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.7 },
    });

    const result = await model.generateContentStream({ contents });

    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  },
};
