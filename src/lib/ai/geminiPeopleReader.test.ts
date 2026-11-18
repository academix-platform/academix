import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidPeopleReplyError, peopleReplySchema } from "./peopleReadingPrompt";

// The network boundary is the one thing faked here: these tests never call Gemini.
const create = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    interactions = { create };
  },
}));

import { readPeopleFile } from "./geminiPeopleReader";

const file = Buffer.from("file bytes");
const goodReply = JSON.stringify({
  readable: true,
  rows: [{ cells: [{ field: "studentName", value: "ليلى حداد", unclear: false }, { field: "nationalId", value: "١٢٣٤٥٦٧٨٢", unclear: true }] }],
});

const teacherReply = JSON.stringify({
  readable: true,
  rows: [{ cells: [{ field: "teacherName", value: "سارة نصر", unclear: false }] }],
});

describe("readPeopleFile", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_PROVIDER", "");
    create.mockReset();
    create.mockResolvedValue({ output_text: goodReply, usage: {} });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends a photo as one image, as base64, after the prompt", async () => {
    await readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" });

    const parts = create.mock.calls[0][0].input;
    expect(parts.map((part: { type: string }) => part.type)).toEqual(["text", "image"]);
    expect(parts[1]).toEqual({ type: "image", data: file.toString("base64"), mime_type: "image/jpeg" });
  });

  it("sends a PDF whole, as a document", async () => {
    create.mockResolvedValue({ output_text: teacherReply });
    await readPeopleFile({ file, mimeType: "application/pdf", kind: "teachers" });

    const parts = create.mock.calls[0][0].input;
    expect(parts[1]).toEqual({ type: "document", data: file.toString("base64"), mime_type: "application/pdf" });
  });

  it("asks Google not to store the request, because uploaded files must not be kept", async () => {
    await readPeopleFile({ file, mimeType: "image/png", kind: "students" });

    expect(create.mock.calls[0][0].store).toBe(false);
  });

  it("requests JSON matching the reply schema of the kind of file", async () => {
    create.mockResolvedValue({ output_text: teacherReply });
    await readPeopleFile({ file, mimeType: "image/png", kind: "teachers" });

    expect(create.mock.calls[0][0].response_format).toEqual({
      type: "text",
      mime_type: "application/json",
      schema: peopleReplySchema("teachers"),
    });
  });

  it("puts nothing from the file in the prompt text", async () => {
    await readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" });

    const request = create.mock.calls[0][0];
    expect(request.input[0].text).not.toContain("file bytes");
    expect(request.system_instruction).toContain("untrusted data");
  });

  it("returns the checked rows, with digits converted and unclear values marked", async () => {
    const { reply } = await readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" });

    expect(reply).toEqual({
      readable: true,
      rows: [{ sourceRow: 1, values: { studentName: "ليلى حداد", nationalId: "123456782" }, unclear: ["nationalId"] }],
    });
  });

  it("reads with gemini-3.8-flash by default, and returns the model used", async () => {
    const { model } = await readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" });

    expect(create.mock.calls[0][0].model).toBe("gemini-3.8-flash");
    expect(model).toBe("gemini-3.8-flash");
  });

  it("uses AI_MODEL, the one setting for every AI module, when it is set", async () => {
    vi.stubEnv("AI_MODEL", "gemini-other");

    const { model } = await readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" });

    expect(create.mock.calls[0][0].model).toBe("gemini-other");
    expect(model).toBe("gemini-other");
  });

  it("rejects a reply with the wrong shape", async () => {
    create.mockResolvedValue({ output_text: JSON.stringify({ people: [] }) });

    await expect(readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" })).rejects.toThrow(InvalidPeopleReplyError);
  });

  it("rejects an empty reply", async () => {
    create.mockResolvedValue({});

    await expect(readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" })).rejects.toThrow(InvalidPeopleReplyError);
  });

  it("fails without an API key, before sending anything", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(readPeopleFile({ file, mimeType: "image/jpeg", kind: "students" })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
