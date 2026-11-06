// Turns a handwritten mark, as transcribed from a sheet, into a number.
// Teachers may write Western or Eastern Arabic digits, and may mix them.

const INVISIBLE_DIRECTION_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;
const ARABIC_DIGITS = /[٠-٩]/g; // ٠-٩
const PERSIAN_DIGITS = /[۰-۹]/g; // ۰-۹
const DECIMAL_MARKS = /[٫,،]/g;

// Two decimal places at most, so "1,000" is refused rather than read as 1.
const PLAIN_NUMBER = /^\d+(\.\d{1,2})?$/;

const toWesternDigit = (firstDigit: number) => (digit: string) =>
  String(digit.charCodeAt(0) - firstDigit);

/** Returns the number, or null when the text isn't a clean non-negative number. */
export const parseWrittenNumber = (written: string): number | null => {
  const text = written
    .replace(INVISIBLE_DIRECTION_MARKS, "")
    .trim()
    .replace(ARABIC_DIGITS, toWesternDigit(0x0660))
    .replace(PERSIAN_DIGITS, toWesternDigit(0x06f0))
    .replace(DECIMAL_MARKS, ".");

  return PLAIN_NUMBER.test(text) ? Number(text) : null;
};
