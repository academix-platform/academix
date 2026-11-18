// The one AI setting, shared by every module that calls an AI: reading entry
// sheets, AI grading, reading spreadsheet columns, and reading people from
// photos and PDFs. Read on each call, so a changed setting takes effect at once.
//
//   AI_PROVIDER=gemini (the default) or groq
//   AI_MODEL=the model to use, or empty for the provider's default
//
// Groq's vision model reads images but not PDFs, so with Groq a PDF can't be read.
// Sources: https://aistudio.google.com/docs/interactions-overview
// https://console.groq.com/docs/vision

export type AiProvider = "gemini" | "groq";

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-3.8-flash",
  // Reads text and images, and follows a JSON schema.
  groq: "qwen/qwen3.8-27b",
};

/** Kept for code that names the Gemini default. */
export const DEFAULT_GEMINI_MODEL = DEFAULT_MODELS.gemini;

/** The AI every module uses: AI_PROVIDER, or Gemini. */
export const aiProvider = (): AiProvider =>
  process.env.AI_PROVIDER?.trim().toLowerCase() === "groq" ? "groq" : "gemini";

/** The model every module uses: AI_MODEL, or the provider's default. */
export const aiModel = () => process.env.AI_MODEL?.trim() || DEFAULT_MODELS[aiProvider()];

/** Kept under its old name for the Gemini modules: the same as aiModel. */
export const geminiModel = aiModel;

/** Thrown when the chosen AI can't read a PDF. */
export class PdfNotSupportedError extends Error {
  constructor() {
    super("The chosen AI provider can't read PDF files.");
    this.name = "PdfNotSupportedError";
  }
}
