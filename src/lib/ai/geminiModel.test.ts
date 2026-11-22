import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_GEMINI_MODEL, geminiModel } from "./geminiModel";

describe("geminiModel", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is gemini-3.8-flash when AI_MODEL isn't set", () => {
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_PROVIDER", "");

    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.8-flash");
    expect(geminiModel()).toBe("gemini-3.8-flash");
  });

  it("is AI_MODEL when it is set", () => {
    vi.stubEnv("AI_MODEL", "gemini-other");

    expect(geminiModel()).toBe("gemini-other");
  });

  it("reads the setting each time, so a change needs no new import", () => {
    vi.stubEnv("AI_MODEL", "gemini-first");
    expect(geminiModel()).toBe("gemini-first");

    vi.stubEnv("AI_MODEL", "gemini-second");
    expect(geminiModel()).toBe("gemini-second");
  });
});
