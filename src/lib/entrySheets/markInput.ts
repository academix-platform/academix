// Checks a mark typed on the class entry screen. Safe to use in the browser.
// The server repeats every check when saving.

import { parseWrittenNumber } from "./digits";

export type TypedMark =
  | { kind: "empty" }
  | { kind: "mark"; score: number }
  | { kind: "error"; reason: "notANumber" | "aboveMax" };

export const readTypedMark = (text: string, maxScore: number): TypedMark => {
  if (!text.trim()) return { kind: "empty" };

  const score = parseWrittenNumber(text);
  if (score === null) return { kind: "error", reason: "notANumber" };
  if (score > maxScore) return { kind: "error", reason: "aboveMax" };
  return { kind: "mark", score };
};
