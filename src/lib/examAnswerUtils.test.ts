import { describe, expect, it } from "vitest";
import { getAutoGradeScore, normalizeStoredAnswer } from "./examAnswerUtils";

describe("getAutoGradeScore", () => {
  it("gives full points for a correct single answer", () => {
    expect(getAutoGradeScore("TRUE", ["TRUE"], false, 2)).toBe(2);
  });

  it("gives zero for a wrong or empty single answer", () => {
    expect(getAutoGradeScore("FALSE", ["TRUE"], false, 2)).toBe(0);
    expect(getAutoGradeScore(null, ["TRUE"], false, 2)).toBe(0);
  });

  it("gives partial credit for a subset of correct multi answers", () => {
    expect(getAutoGradeScore('["A"]', ["A", "B"], true, 4)).toBe(2);
  });

  it("gives zero when any wrong choice is selected", () => {
    expect(getAutoGradeScore('["A","C"]', ["A", "B"], true, 4)).toBe(0);
  });

  it("gives zero when the question has no correct answer", () => {
    expect(getAutoGradeScore("A", [], false, 4)).toBe(0);
  });
});

describe("normalizeStoredAnswer", () => {
  it("stores multi answers as a JSON array", () => {
    expect(normalizeStoredAnswer("A, B", true)).toBe('["A","B"]');
  });

  it("keeps null distinct from an empty answer", () => {
    expect(normalizeStoredAnswer(null, false)).toBeNull();
    expect(normalizeStoredAnswer("   ", false)).toBe("");
  });
});
