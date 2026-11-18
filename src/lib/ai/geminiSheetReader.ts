import "server-only";
import { GoogleGenAI } from "@google/genai";
import {
  SHEET_READING_SYSTEM_INSTRUCTION,
  SheetKind,
  SheetReply,
  buildSheetReadingPrompt,
  parseSheetReply,
  sheetReplySchema,
} from "./sheetReadingPrompt";
import { aiProvider, geminiModel } from "./geminiModel";
import { groqJson } from "./groqChat";


export type SheetPhotoMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";

export type SheetReadInput = {
  photo: Buffer;
  mimeType: SheetPhotoMimeType;
  kind: SheetKind;
  /** The row numbers printed on this page. */
  rowNumbers: readonly number[];
};

export type SheetReadResult = {
  reply: SheetReply;
  model: string;
  usage: { inputTokens: number; outputTokens: number; thoughtTokens: number };
};

let client: GoogleGenAI | null = null;
/** The shared Gemini client, also used to read people imports. */
export const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

/**
 * Reads one sheet photo. The photo stays in memory here and is never saved.
 *
 * This uses the Interactions API rather than generateContent because Google
 * stores requests for 55 days by default on the paid tier, and `store: false`
 * is the per-request opt-out. generateContent only accepts it from SDK 2.31.0.
 * Sources: https://aistudio.google.com/docs/image-understanding
 * https://aistudio.google.com/docs/structured-output
 * https://aistudio.google.com/docs/logs-datasets
 */
export async function readSheetPhoto({
  photo,
  mimeType,
  kind,
  rowNumbers,
}: SheetReadInput): Promise<SheetReadResult> {
  if (aiProvider() === "groq") {
    const read = await groqJson({
      system: SHEET_READING_SYSTEM_INSTRUCTION,
      text: buildSheetReadingPrompt(kind),
      image: { data: photo, mimeType },
      schema: sheetReplySchema,
      name: "sheet_reply",
    });
    return {
      reply: parseSheetReply(read.text, { kind, rowNumbers }),
      model: read.model,
      usage: { ...read.usage, thoughtTokens: 0 },
    };
  }

  const gemini = getGeminiClient();
  const model = geminiModel();

  const interaction = await gemini.interactions.create({
    model,
    store: false,
    system_instruction: SHEET_READING_SYSTEM_INSTRUCTION,
    input: [
      { type: "text", text: buildSheetReadingPrompt(kind) },
      { type: "image", data: photo.toString("base64"), mime_type: mimeType },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: sheetReplySchema,
    },
  });

  return {
    reply: parseSheetReply(interaction.output_text ?? "", { kind, rowNumbers }),
    model,
    usage: {
      inputTokens: interaction.usage?.total_input_tokens ?? 0,
      outputTokens: interaction.usage?.total_output_tokens ?? 0,
      thoughtTokens: interaction.usage?.total_thought_tokens ?? 0,
    },
  };
}
