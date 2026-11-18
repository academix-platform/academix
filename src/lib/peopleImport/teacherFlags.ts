// The review screen's rules for teachers: each row's status, what it would
// change, and the flags that must be fixed before it's saved. Pure rules, run
// on the server for the review screen and again when saving.

import type { PersonField, TeacherField } from "./columns";
import { findTeacherMatch, teacherChanges, type ExistingTeacher, type ParsedTeacherValues } from "./matching";
import {
  parseBloodType,
  parseDate,
  parseEmail,
  parsePhone,
  parseSex,
  type ImportRow,
  type ReviewedChange,
  type RowDecision,
} from "./rowFlags";
import { readSubjects, splitSubjects, type SchoolSubject } from "./subjects";

export type TeacherContext = {
  teachers: ExistingTeacher[];
  subjects: SchoolSubject[];
  /** Grades with at least one class. A subject of any other grade can't be given to a teacher yet. */
  gradesWithClasses: number[];
};

export type SubjectLabel = { id: number; name: string; level: number };

export type TeacherRowFlag =
  | { kind: "requiredMissing"; fields: TeacherField[] }
  /** No email and no phone: the teacher could never be found again, and would be added twice. */
  | { kind: "noContact" }
  | { kind: "unclear"; fields: PersonField[] }
  | { kind: "duplicateInFile"; otherRows: number[] }
  /** The email is one teacher's and this contact is another's. */
  | { kind: "contactTaken"; fields: ("email" | "phone")[] }
  /** A subject the school doesn't have, or a name several grades have. */
  | { kind: "unknownSubject"; subjects: { text: string; candidates: SubjectLabel[] }[] }
  /** A subject whose grade has no classes, which the teacher form refuses too. */
  | { kind: "subjectWithoutClasses"; subjects: (SubjectLabel & { text: string })[] }
  | { kind: "missingOptional"; fields: TeacherField[] };

/** Every flag but the missing-optional warning stops a row from being saved. */
export const isBlockingTeacherFlag = (flag: TeacherRowFlag) => flag.kind !== "missingOptional";

export type ReviewedTeacherRow = {
  sourceRow: number;
  teacher: ParsedTeacherValues;
  status: "new" | "update" | "noChanges" | "skipped";
  existingId?: string;
  changes: ReviewedChange<TeacherField>[];
  /** The row's subjects. `isNew` marks the ones the teacher doesn't have yet. */
  subjects: (SubjectLabel & { isNew: boolean })[];
  flags: TeacherRowFlag[];
  canSave: boolean;
};

/**
 * Turns a row's text into typed values. A value that can't be read is left out
 * and named in `unclear`, so the admin fixes it instead of the system guessing.
 */
export const parseTeacherValues = (raw: ImportRow["values"]) => {
  const values: ParsedTeacherValues = {};
  const unclear: TeacherField[] = [];
  const read = <T>(field: TeacherField, parse: (text: string) => T | undefined, set: (value: T) => void) => {
    const text = raw[field]?.trim();
    if (!text) return;
    const value = parse(text);
    if (value === undefined) unclear.push(field);
    else set(value);
  };
  const text = (value: string) => value.replace(/\s+/g, " ").trim();

  read("teacherName", text, (v) => (values.name = v));
  read("email", parseEmail, (v) => (values.email = v));
  read("phone", parsePhone, (v) => (values.phone = v));
  read("sex", parseSex, (v) => (values.sex = v));
  read("birthday", parseDate, (v) => (values.birthday = v));
  read("bloodType", parseBloodType, (v) => (values.bloodType = v));
  read("address", text, (v) => (values.address = v));
  return { values, unclear };
};

const OPTIONAL_FIELDS = ["bloodType", "address", "birthday"] as const;

const label = ({ id, name, level }: SchoolSubject): SubjectLabel => ({ id, name, level });

/** The text in the cell that gave this subject, so the admin's choice to remove it can be keyed by it. */
const writtenAs = (cell: string | undefined, subject: SchoolSubject, subjects: SchoolSubject[], decision: RowDecision) =>
  splitSubjects(cell).find((text) =>
    readSubjects(text, subjects, decision.subjectChoices).matched.some((found) => found.id === subject.id),
  ) ?? subject.name;

/**
 * Reviews every row of a teachers file against the school. Each row is judged
 * on its own, apart from emails and phones repeated in the file.
 */
export const reviewTeacherRows = (
  rows: ImportRow[],
  context: TeacherContext,
  decisions: Record<number, RowDecision> = {},
): ReviewedTeacherRow[] => {
  const parsed = rows.map((row) => ({
    row,
    decision: decisions[row.sourceRow] ?? {},
    ...parseTeacherValues(row.values),
  }));

  // Rows by each email and phone, to find the ones the file repeats.
  const rowsByContact = new Map<string, number[]>();
  for (const { row, decision, values } of parsed) {
    if (decision.skip) continue;
    for (const contact of [values.email, values.phone]) {
      if (contact) rowsByContact.set(contact, [...(rowsByContact.get(contact) ?? []), row.sourceRow]);
    }
  }

  return parsed.map(({ row, decision, values, unclear }) => {
    if (decision.skip) {
      return { sourceRow: row.sourceRow, teacher: values, status: "skipped", changes: [], subjects: [], flags: [], canSave: false };
    }

    const flags: TeacherRowFlag[] = [];
    const missing: TeacherField[] = [];
    if (!row.values.teacherName?.trim()) missing.push("teacherName");
    if (!row.values.sex?.trim()) missing.push("sex");
    if (missing.length) flags.push({ kind: "requiredMissing", fields: missing });
    if (!row.values.email?.trim() && !row.values.phone?.trim()) flags.push({ kind: "noContact" });

    const unclearFields = [...new Set([...(row.unclear ?? []), ...unclear])];
    if (unclearFields.length) flags.push({ kind: "unclear", fields: unclearFields });

    const sameContact = new Set(
      [values.email, values.phone].flatMap((contact) => (contact ? (rowsByContact.get(contact) ?? []) : [])),
    );
    sameContact.delete(row.sourceRow);
    if (sameContact.size) flags.push({ kind: "duplicateInFile", otherRows: [...sameContact].sort((a, b) => a - b) });

    // Who this row is: found by email first, then by phone.
    const existing = findTeacherMatch(values, context.teachers) ?? undefined;
    if (existing) {
      const taken = (["email", "phone"] as const).filter((field) => {
        const owner = values[field] && findTeacherMatch({ [field]: values[field] }, context.teachers);
        return owner && owner.id !== existing.id;
      });
      if (taken.length) flags.push({ kind: "contactTaken", fields: taken });
    }

    const rejected = decision.rejectedChanges ?? [];
    const changes = existing
      ? teacherChanges(values, existing).map((change) => ({ ...change, accepted: !rejected.includes(change.field) }))
      : [];

    // The subjects: matched by name and grade, with the admin's choices applied.
    const read = readSubjects(row.values.subjects, context.subjects, decision.subjectChoices);
    if (read.unknown.length) {
      flags.push({
        kind: "unknownSubject",
        subjects: read.unknown.map(({ text, candidates }) => ({ text, candidates: candidates.map(label) })),
      });
    }
    const noClasses = read.matched.filter((subject) => !context.gradesWithClasses.includes(subject.gradeId));
    if (noClasses.length) {
      flags.push({
        kind: "subjectWithoutClasses",
        subjects: noClasses.map((subject) => ({
          text: writtenAs(row.values.subjects, subject, context.subjects, decision),
          ...label(subject),
        })),
      });
    }
    const subjects = read.matched.map((subject) => ({
      ...label(subject),
      isNew: !existing?.subjectIds.includes(subject.id),
    }));

    const missingOptional = OPTIONAL_FIELDS.filter(
      (field) => values[field] === undefined && !unclearFields.includes(field) && !(existing && existing[field]),
    );
    if (missingOptional.length) flags.push({ kind: "missingOptional", fields: [...missingOptional] });

    return {
      sourceRow: row.sourceRow,
      teacher: values,
      status: existing
        ? changes.some((change) => change.accepted) || subjects.some((subject) => subject.isNew)
          ? "update"
          : "noChanges"
        : "new",
      ...(existing && { existingId: existing.id }),
      changes,
      subjects,
      flags,
      canSave: !flags.some(isBlockingTeacherFlag),
    };
  });
};
