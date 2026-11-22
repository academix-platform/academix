// Palestinian national ID: 9 digits, the last one a check digit.
// Excel drops leading zeros, so a shorter ID is padded before checking.

import { toWesternDigits } from "@/lib/entrySheets/digits";

export const NATIONAL_ID_LENGTH = 9;

export type NationalIdCheck =
  | { ok: true; id: string }
  | { ok: false; reason: "format" | "checkDigit" };

const UP_TO_NINE_DIGITS = /^\d{1,9}$/;

/**
 * Returns the 9-digit ID, or why it was refused. Letters and symbols are
 * refused rather than dropped, so a misread value is never quietly "repaired".
 */
export const checkNationalId = (raw: string): NationalIdCheck => {
  const digits = toWesternDigits(raw).trim();
  if (!UP_TO_NINE_DIGITS.test(digits) || Number(digits) === 0) {
    return { ok: false, reason: "format" };
  }

  const id = digits.padStart(NATIONAL_ID_LENGTH, "0");
  const total = [...id].reduce((sum, digit, position) => {
    const product = Number(digit) * (position % 2 === 0 ? 1 : 2);
    return sum + (product > 9 ? product - 9 : product);
  }, 0);

  return total % 10 === 0 ? { ok: true, id } : { ok: false, reason: "checkDigit" };
};

export type NationalIdProblem = "nationalIdRequired" | "nationalIdFormat" | "nationalIdCheckDigit";

/** Reads an ID typed into a form: the 9-digit ID, or what is wrong with it. */
export const readNationalId = (
  raw: string | null | undefined,
): { ok: true; id: string } | { ok: false; problem: NationalIdProblem } => {
  if (!raw?.trim()) return { ok: false, problem: "nationalIdRequired" };
  const check = checkNationalId(raw);
  if (check.ok) return check;
  return { ok: false, problem: check.reason === "format" ? "nationalIdFormat" : "nationalIdCheckDigit" };
};

/** What is wrong with an ID typed into a form, or null when it is valid. */
export const nationalIdProblem = (raw: string | null | undefined): NationalIdProblem | null => {
  const read = readNationalId(raw);
  return read.ok ? null : read.problem;
};
