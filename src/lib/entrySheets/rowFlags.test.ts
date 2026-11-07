import { describe, expect, it } from "vitest";
import type { PhotoReadRow } from "./photoRead";
import {
  departedStudents,
  isRowHandled,
  needsExplicitAccept,
  resultRowFlags,
  sameStudentName,
} from "./rowFlags";

const read = (fields: Partial<PhotoReadRow> = {}): PhotoReadRow => ({
  studentId: "s1",
  rowNumber: 1,
  name: "سليم الوادي",
  printedName: "سليم الوادي",
  written: "15",
  score: 15,
  unclear: false,
  ...fields,
});

const base = { name: "سليم الوادي", existingScore: null, maxScore: 20, typed: { kind: "mark" as const, score: 15 } };

describe("resultRowFlags", () => {
  it("flags nothing for a clear mark read from the right row", () => {
    expect(resultRowFlags({ ...base, read: read(), onSheet: true })).toEqual([]);
  });

  it("flags an unclear mark", () => {
    const flags = resultRowFlags({ ...base, typed: { kind: "empty" }, read: read({ written: "", score: null, unclear: true }), onSheet: true });

    expect(flags).toEqual(["unclear"]);
  });

  it("flags a printed name that doesn't match the saved row", () => {
    expect(resultRowFlags({ ...base, read: read({ printedName: "ليان القصير" }), onSheet: true })).toEqual([
      "nameMismatch",
    ]);
  });

  it("doesn't flag a name that only differs in spacing or letter forms", () => {
    expect(resultRowFlags({ ...base, read: read({ printedName: "سليم  الوادى" }), onSheet: true })).toEqual([]);
  });

  it("flags a mark that would replace an existing result", () => {
    expect(resultRowFlags({ ...base, existingScore: 12, read: read(), onSheet: true })).toEqual([
      "replacesExisting",
    ]);
  });

  it("flags an empty box on the photo", () => {
    const flags = resultRowFlags({ ...base, typed: { kind: "empty" }, read: read({ written: "", score: null }), onSheet: true });

    expect(flags).toEqual(["empty"]);
  });

  it("flags a mark above the maximum", () => {
    const flags = resultRowFlags({
      ...base,
      typed: { kind: "error", reason: "aboveMax" },
      read: read({ written: "25", score: 25 }),
      onSheet: true,
    });

    expect(flags).toEqual(["aboveMax"]);
  });

  it("flags a student on the class list but not on the printed sheet", () => {
    expect(resultRowFlags({ ...base, typed: { kind: "empty" }, onSheet: false })).toEqual(["notOnSheet"]);
  });

  it("flags only a replacement when marks are typed without a photo", () => {
    expect(resultRowFlags({ ...base, onSheet: null })).toEqual([]);
    expect(resultRowFlags({ ...base, existingScore: 12, onSheet: null })).toEqual(["replacesExisting"]);
  });

  it("doesn't flag an empty row when marks are typed without a photo", () => {
    expect(resultRowFlags({ ...base, typed: { kind: "empty" }, onSheet: null })).toEqual([]);
  });

  it("doesn't flag a replacement when nothing would be saved", () => {
    expect(resultRowFlags({ ...base, typed: { kind: "empty" }, existingScore: 12, onSheet: null })).toEqual([]);
  });
});

describe("isRowHandled", () => {
  it("treats a row with no flags as handled", () => {
    expect(isRowHandled([], { edited: false })).toBe(true);
  });

  it("needs a decision for a flagged row nobody touched", () => {
    expect(isRowHandled(["unclear"], { edited: false })).toBe(false);
  });

  it.each(["accept", "skip"] as const)("accepts a %s decision for any flag", (decision) => {
    expect(isRowHandled(["nameMismatch", "replacesExisting"], { decision, edited: false })).toBe(true);
  });

  it("counts typing a new value as fixing a value flag", () => {
    expect(isRowHandled(["unclear"], { edited: true })).toBe(true);
    expect(isRowHandled(["empty", "aboveMax", "notOnSheet"], { edited: true })).toBe(true);
  });

  it("still needs an explicit accept for a name mismatch or a replacement after editing", () => {
    expect(needsExplicitAccept("nameMismatch")).toBe(true);
    expect(needsExplicitAccept("replacesExisting")).toBe(true);
    expect(isRowHandled(["unclear", "replacesExisting"], { edited: true })).toBe(false);
  });
});

describe("departedStudents", () => {
  it("lists sheet students who are no longer on the class screen", () => {
    const sheet = [
      { studentId: "s1", name: "سليم الوادي" },
      { studentId: "s2", name: "ليان القصير" },
    ];

    expect(departedStudents(sheet, ["s1"])).toEqual([{ studentId: "s2", name: "ليان القصير" }]);
  });
});

describe("sameStudentName", () => {
  it.each([
    ["spacing", "سليم  الوادي"],
    ["vowel marks", "سَليم الوادي"],
    ["hamza forms", "سليم الوادي".replace("ا", "أ")],
    ["ى and ي", "سليم الوادى"],
  ])("ignores %s", (_label, other) => {
    expect(sameStudentName("سليم الوادي", other)).toBe(true);
  });

  it("tells different students apart", () => {
    expect(sameStudentName("سليم الوادي", "ليان القصير")).toBe(false);
  });
});
