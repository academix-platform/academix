import "server-only";

import { aiModel } from "./geminiModel";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 60_000;

export type GroqJsonRequest = {
  system: string;
  text: string;
  /** One image to read with the text, such as a photographed sheet. */
  image?: { data: Buffer; mimeType: string };
  /** The JSON schema the reply must follow. */
  schema: object;
  name: string;
  /** Strict mode needs every object closed and every field required. */
  strict?: boolean;
};

/**
 * Asks Groq for a JSON reply, with an image when given, and returns the reply's
 * text for the caller to check. Groq doesn't keep inference requests by
 * default, apart from logs kept up to 30 days when it investigates abuse or
 * errors; Zero Data Retention turns that off in the Groq console.
 * Sources: https://console.groq.com/docs/vision
 * https://console.groq.com/docs/structured-outputs
 * https://console.groq.com/docs/your-data
 */
export async function groqJson({ system, text, image, schema, name, strict = false }: GroqJsonRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
  const model = aiModel();

  const content = image
    ? [
        { type: "text", text },
        { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data.toString("base64")}` } },
      ]
    : text;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict, schema } },
    }),
  });
  if (!response.ok) {
    // The status goes in the name, since callers log error names only.
    const error = new Error(`Groq answered ${response.status}.`);
    error.name = `GroqHttp${response.status}`;
    throw error;
  }

  const reply = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: reply.choices?.[0]?.message?.content ?? "",
    model,
    usage: { inputTokens: reply.usage?.prompt_tokens ?? 0, outputTokens: reply.usage?.completion_tokens ?? 0 },
  };
}
