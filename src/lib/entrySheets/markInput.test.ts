import { describe, expect, it } from "vitest";
import { readTypedMark } from "./markInput";

describe("readTypedMark", () => {
  it("reads a mark typed in Western digits", () => {
    expect(readTypedMark("15", 20)).toEqual({ kind: "mark", score: 15 });
  });

  it("reads a mark typed on an Arabic keyboard", () => {
    expect(readTypedMark("١٢٫٥", 20)).toEqual({ kind: "mark", score: 12.5 });
  });

  it("treats an empty box as no mark", () => {
    expect(readTypedMark("  ", 20)).toEqual({ kind: "empty" });
  });

  it("accepts the maximum score", () => {
    expect(readTypedMark("20", 20)).toEqual({ kind: "mark", score: 20 });
  });

  it("refuses a mark above the maximum", () => {
    expect(readTypedMark("21", 20)).toEqual({ kind: "error", reason: "aboveMax" });
  });

  it.each(["abc", "-3", "1.2.3", "غ"])("refuses %s, which isn't a mark", (text) => {
    expect(readTypedMark(text, 20)).toEqual({ kind: "error", reason: "notANumber" });
  });
});
