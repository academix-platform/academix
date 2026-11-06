import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidSheetReplyError, sheetReplySchema } from "./sheetReadingPrompt";

// The network boundary is the one thing faked here: these tests never call Gemini.
const create = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    interactions = { create };
  },
}));

import { readSheetPhoto } from "./geminiSheetReader";

const photo = Buffer.from("photo bytes");
const input = {
  photo,
  mimeType: "image/jpeg",
  kind: "RESULT",
  rowNumbers: [1],
} as const;

const goodReply = JSON.stringify({
  readable: true,
  sheetCode: "AB12",
  pageNumber: 1,
  rows: [{ rowNumber: 1, printedName: "Student", value: "١٥", unclear: false }],
});

describe("readSheetPhoto", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    create.mockReset();
    create.mockResolvedValue({ output_text: goodReply, usage: {} });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends one image, as base64, after the prompt", async () => {
    await readSheetPhoto(input);

    const parts = create.mock.calls[0][0].input;
    expect(parts.map((part: { type: string }) => part.type)).toEqual(["text", "image"]);
    expect(parts[1]).toEqual({
      type: "image",
      data: photo.toString("base64"),
      mime_type: "image/jpeg",
    });
  });

  it("asks Google not to store the request, because photos must not be kept", async () => {
    await readSheetPhoto(input);

    expect(create.mock.calls[0][0].store).toBe(false);
  });

  it("requests JSON matching the reply schema", async () => {
    await readSheetPhoto(input);

    expect(create.mock.calls[0][0].response_format).toEqual({
      type: "text",
      mime_type: "application/json",
      schema: sheetReplySchema,
    });
  });

  it("returns the checked reply, not Gemini's raw text", async () => {
    const { reply } = await readSheetPhoto(input);

    expect(reply.rows[0]).toMatchObject({ rowNumber: 1, score: 15 });
  });

  it("rejects a reply that names a row outside the sheet", async () => {
    await expect(readSheetPhoto({ ...input, rowNumbers: [2] })).rejects.toThrow(
      InvalidSheetReplyError,
    );
  });

  it("treats a missing reply as a bad reply", async () => {
    create.mockResolvedValue({ usage: {} });

    await expect(readSheetPhoto(input)).rejects.toThrow(InvalidSheetReplyError);
  });

  it("reports the tokens used, including thinking", async () => {
    create.mockResolvedValue({
      output_text: goodReply,
      usage: {
        total_input_tokens: 1000,
        total_output_tokens: 200,
        total_thought_tokens: 50,
      },
    });

    const { usage } = await readSheetPhoto(input);

    expect(usage).toEqual({ inputTokens: 1000, outputTokens: 200, thoughtTokens: 50 });
  });

  it("uses the GEMINI_MODEL setting when it is set", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-test-model");

    const { model } = await readSheetPhoto(input);

    expect(model).toBe("gemini-test-model");
    expect(create.mock.calls[0][0].model).toBe("gemini-test-model");
  });

  it("defaults to a stable model that isn't deprecated", async () => {
    const { model } = await readSheetPhoto(input);

    expect(model).toBe("gemini-3.6-flash");
  });

  it("fails clearly when the API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(readSheetPhoto(input)).rejects.toThrow(/GEMINI_API_KEY/);
    expect(create).not.toHaveBeenCalled();
  });
});
