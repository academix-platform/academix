import { describe, expect, it } from "vitest";
import { parseWrittenNumber } from "./digits";

describe("parseWrittenNumber", () => {
  it.each([
    ["0", 0],
    ["7", 7],
    ["15", 15],
    ["100", 100],
    ["12.5", 12.5],
  ])("reads Western digits: %s", (written, expected) => {
    expect(parseWrittenNumber(written)).toBe(expected);
  });

  it.each([
    ["٠", 0],
    ["٧", 7],
    ["١٥", 15],
    ["١٠٠", 100],
    ["٠١٢٣٤٥٦٧٨٩", 123456789],
  ])("reads Eastern Arabic digits: %s", (written, expected) => {
    expect(parseWrittenNumber(written)).toBe(expected);
  });

  it("reads the Persian digit forms Gemini sometimes returns for Arabic digits", () => {
    expect(parseWrittenNumber("۱۵")).toBe(15);
  });

  it.each([
    ["1٥", 15],
    ["١5", 15],
    ["1٢.٥", 12.5],
  ])("reads digits of both styles mixed in one value: %s", (written, expected) => {
    expect(parseWrittenNumber(written)).toBe(expected);
  });

  it.each([
    ["١٢٫٥", 12.5],
    ["12٫5", 12.5],
    ["١٢,٥", 12.5],
    ["12,5", 12.5],
    ["١٢،٥", 12.5],
  ])("reads Arabic decimal marks: %s", (written, expected) => {
    expect(parseWrittenNumber(written)).toBe(expected);
  });

  it("ignores spaces around the value", () => {
    expect(parseWrittenNumber("  ١٥ ")).toBe(15);
  });

  it("ignores the invisible direction marks Arabic text can carry", () => {
    expect(parseWrittenNumber("‏١٥‎")).toBe(15);
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["letters", "abc"],
    ["an Arabic letter", "غ"],
    ["two decimal marks", "1.2.3"],
    ["a leading decimal mark", ".5"],
    ["a trailing decimal mark", "5."],
    ["a space between digits", "1 5"],
    ["a negative number", "-5"],
    ["a fraction", "15/20"],
    ["a thousands mark", "١٬٠٠٠"],
    ["a comma used as a thousands mark", "1,000"],
    ["digits with a letter", "15a"],
  ])("returns null instead of guessing for %s", (_label, written) => {
    expect(parseWrittenNumber(written)).toBeNull();
  });
});
