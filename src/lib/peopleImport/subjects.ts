// Reading a teacher row's subjects and matching them to the school's. A
// subject is written as its name, with the grade when needed, such as
// "رياضيات 7". Pure rules, no database.

import { toWesternDigits } from "@/lib/entrySheets/digits";

import { normalizeName } from "./matching";

export type SchoolSubject = { id: number; name: string; gradeId: number; level: number };

/** A subject from the file that needs the admin: none matched, or several did. */
export type UnknownSubject = { text: string; candidates: SchoolSubject[] };

/** The admin's choice for a subject as written in the file: a school subject, or null to remove it. */
export type SubjectChoices = Record<string, number | null>;

export const MAX_SUBJECTS_PER_ROW = 40;

/** The subjects written in one cell, in order, each once. */
export const splitSubjects = (cell: string | undefined): string[] => [
  ...new Set(
    (cell ?? "")
      .split(/[,،;؛/|\n]+/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  ),
].slice(0, MAX_SUBJECTS_PER_ROW);

/** "رياضيات - 7" or "رياضيات (7)" as a name and a grade level. */
const nameAndLevel = (text: string) => {
  const match = toWesternDigits(text).match(/^(.*?)[\s\-–(]*(\d{1,2})\s*\)?$/);
  return match && match[1].trim() ? { name: match[1].trim(), level: Number(match[2]) } : null;
};

const matchOne = (text: string, subjects: SchoolSubject[]): SchoolSubject | UnknownSubject => {
  const named = (name: string) => subjects.filter((subject) => normalizeName(subject.name) === normalizeName(name));

  // The whole text first, so a subject whose own name ends in a number is found.
  const whole = named(toWesternDigits(text));
  if (whole.length === 1) return whole[0];
  if (whole.length > 1) return { text, candidates: whole };

  const parts = nameAndLevel(text);
  if (!parts) return { text, candidates: [] };
  const sameName = named(parts.name);
  const inGrade = sameName.filter((subject) => subject.level === parts.level);
  return inGrade.length === 1 ? inGrade[0] : { text, candidates: sameName };
};

/**
 * Matches a cell's subjects to the school's by name and grade. A name that
 * matches no subject, or several grades, is returned for the admin to choose
 * or remove. The admin's choices are keyed by the subject as written.
 */
export const readSubjects = (
  cell: string | undefined,
  subjects: SchoolSubject[],
  choices: SubjectChoices = {},
): { matched: SchoolSubject[]; unknown: UnknownSubject[] } => {
  const matched = new Map<number, SchoolSubject>();
  const unknown: UnknownSubject[] = [];

  for (const text of splitSubjects(cell)) {
    const choice = Object.hasOwn(choices, text) ? choices[text] : undefined;
    if (choice === null) continue;

    const result = matchOne(text, subjects);
    const picked = choice === undefined ? undefined : subjects.find((subject) => subject.id === choice);
    const subject = picked ?? ("id" in result ? result : undefined);
    if (subject) matched.set(subject.id, subject);
    else unknown.push("id" in result ? { text, candidates: [] } : result);
  }

  return { matched: [...matched.values()], unknown };
};
