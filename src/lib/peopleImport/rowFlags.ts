// The review screen's rules for students and parents: each row's status,
// what it would change, and the flags that must be fixed before it's saved.
// Pure rules, run on the server for the review screen and again when saving.

import type { ImportedRow, PersonField, StudentField } from "./columns";
import {
  findParentByPhone,
  findStudentMatch,
  matchClass,
  normalizeName,
  studentChanges,
  type Change,
  type ExistingParent,
  type ExistingStudent,
  type ParsedStudentValues,
  type SchoolClass,
} from "./matching";
import { readNationalId } from "./nationalId";
import type { SubjectChoices } from "./subjects";

export type StudentContext = { classes: SchoolClass[]; students: ExistingStudent[]; parents: ExistingParent[] };

/** The admin's choices for a row on the review screen. */
export type RowDecision = {
  skip?: boolean;
  /** The class picked for a class name the school doesn't have. */
  classId?: number;
  /** "Same student": the old student without an ID this row describes. */
  sameAs?: string;
  /** "New student": the row isn't the old student with the same name. */
  asNew?: boolean;
  /** For a teacher's subject as written in the file: the subject picked, or null to remove it. */
  subjectChoices?: SubjectChoices;
  /** Changes the admin turned down. */
  rejectedChanges?: PersonField[];
};

export type RowFlag =
  | { kind: "requiredMissing"; fields: StudentField[] }
  | { kind: "invalidNationalId"; reason: "format" | "checkDigit" }
  | { kind: "unclear"; fields: PersonField[] }
  | { kind: "unknownClass" }
  | { kind: "duplicateInFile"; otherRows: number[] }
  | { kind: "maybeSameStudent"; candidates: { id: string; name: string; className: string }[] }
  | { kind: "missingOptional"; fields: StudentField[] };

/** Every flag but the missing-optional warning stops a row from being saved. */
export const isBlocking = (flag: RowFlag) => flag.kind !== "missingOptional";

export type ReviewedChange<F extends PersonField = StudentField> = Change<F> & { accepted: boolean };

export type ParentPlan =
  | { status: "none" }
  | { status: "existing"; id: string; changes: ReviewedChange[] }
  | { status: "new"; phone: string; name: string; email?: string };

export type ParsedStudentRow = ParsedStudentValues & { parentName?: string; parentPhone?: string; parentEmail?: string };

export type ReviewedStudentRow = {
  sourceRow: number;
  student: ParsedStudentRow;
  status: "new" | "update" | "noChanges" | "skipped";
  existingId?: string;
  changes: ReviewedChange[];
  parent: ParentPlan;
  flags: RowFlag[];
  canSave: boolean;
};

export type ImportRow = ImportedRow & { unclear?: PersonField[] };

const MALE = new Set(["ذكر", "ذ", "m", "male", "ولد", "boy"]);
const FEMALE = new Set(["انثي", "ا", "f", "female", "بنت", "girl"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parseSex = (text: string) => {
  const value = normalizeName(text);
  if (MALE.has(value)) return "MALE" as const;
  if (FEMALE.has(value)) return "FEMALE" as const;
  return undefined;
};

/** A real calendar date, written year first or day first, as dates are in Palestine. */
export const parseDate = (text: string) => {
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dayFirst = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]]
      : [];
  if (!year) return undefined;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const real = date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  return real && Number(year) >= 1900 && date <= new Date() ? date : undefined;
};

export const parsePhone = (text: string) => {
  const digits = text.replace(/[\s\-().]/g, "").replace(/^(?:\+|00)?97[02]/, "0");
  const withZero = /^5\d{8}$/.test(digits) ? `0${digits}` : digits;
  return /^05\d{8}$/.test(withZero) ? withZero : undefined;
};

export const parseBloodType = (text: string) => {
  const value = text.replace(/\s+/g, "").toUpperCase();
  return /^(A|B|AB|O)[+-]$/.test(value) ? value : undefined;
};

export const parseEmail = (text: string) => {
  const value = text.trim().toLowerCase();
  return EMAIL.test(value) ? value : undefined;
};

/**
 * Turns a row's text into typed values. A value that can't be read is left out
 * and named in `unclear`, so the admin fixes it instead of the system guessing.
 */
export const parseStudentValues = (raw: ImportedRow["values"]) => {
  const values: ParsedStudentRow = {};
  const unclear: PersonField[] = [];
  const read = <T>(field: PersonField, parse: (text: string) => T | undefined, set: (value: T) => void) => {
    const text = raw[field]?.trim();
    if (!text) return;
    const value = parse(text);
    if (value === undefined) unclear.push(field);
    else set(value);
  };
  const text = (value: string) => value.replace(/\s+/g, " ").trim();

  read("studentName", text, (v) => (values.name = v));
  read("sex", parseSex, (v) => (values.sex = v));
  read("birthday", parseDate, (v) => (values.birthday = v));
  read("bloodType", parseBloodType, (v) => (values.bloodType = v));
  read("address", text, (v) => (values.address = v));
  read("studentPhone", parsePhone, (v) => (values.phone = v));
  read("studentEmail", parseEmail, (v) => (values.email = v));
  read("parentName", text, (v) => (values.parentName = v));
  read("parentPhone", parsePhone, (v) => (values.parentPhone = v));
  read("parentEmail", parseEmail, (v) => (values.parentEmail = v));
  return { values, unclear };
};

const OPTIONAL_FIELDS = [
  ["bloodType", "bloodType"],
  ["address", "address"],
  ["birthday", "birthday"],
] as const;

const parentChanges = (row: ParsedStudentRow, parent: ExistingParent, rejected: PersonField[]): ReviewedChange[] => {
  const candidates: [StudentField, string | undefined, string, boolean][] = [
    ["parentName", row.parentName, parent.name, normalizeName(row.parentName ?? "") === normalizeName(parent.name)],
    ["parentEmail", row.parentEmail, parent.email ?? "", (row.parentEmail ?? "") === (parent.email ?? "").toLowerCase()],
  ];
  return candidates.flatMap(([field, to, from, same]) =>
    !to || same ? [] : [{ field, from, to, accepted: !rejected.includes(field) }],
  );
};

/**
 * Reviews every row of a students-and-parents file against the school. Each
 * row is judged on its own, apart from national IDs repeated in the file.
 */
export const reviewStudentRows = (
  rows: ImportRow[],
  context: StudentContext,
  decisions: Record<number, RowDecision> = {},
): ReviewedStudentRow[] => {
  const parsed = rows.map((row) => {
    const decision = decisions[row.sourceRow] ?? {};
    const { values, unclear } = parseStudentValues(row.values);
    const rawId = row.values.nationalId?.trim() ?? "";
    const id = rawId ? readNationalId(rawId) : null;
    if (id?.ok) values.nationalId = id.id;

    const rawClass = row.values.className?.trim() ?? "";
    const pickedClass = context.classes.find((classItem) => classItem.id === decision.classId);
    const classItem = pickedClass ?? matchClass(rawClass, context.classes);
    if (classItem) values.classId = classItem.id;

    return { row, decision, values, unclear, rawId, id, rawClass };
  });

  const rowsById = new Map<string, number[]>();
  for (const { row, decision, values } of parsed) {
    if (decision.skip || !values.nationalId) continue;
    rowsById.set(values.nationalId, [...(rowsById.get(values.nationalId) ?? []), row.sourceRow]);
  }

  return parsed.map(({ row, decision, values, unclear, rawId, id, rawClass }) => {
    const base = { sourceRow: row.sourceRow, student: values, changes: [], parent: { status: "none" } as ParentPlan };
    if (decision.skip) return { ...base, status: "skipped", flags: [], canSave: false };

    const flags: RowFlag[] = [];
    const missing: StudentField[] = [];
    if (!row.values.studentName?.trim()) missing.push("studentName");
    if (!rawClass) missing.push("className");
    if (!row.values.sex?.trim()) missing.push("sex");
    if (!rawId) missing.push("nationalId");
    if (id && !id.ok) {
      flags.push({ kind: "invalidNationalId", reason: id.problem === "nationalIdCheckDigit" ? "checkDigit" : "format" });
    }

    const unclearFields = [...new Set([...(row.unclear ?? []), ...unclear])];
    if (unclearFields.length) flags.push({ kind: "unclear", fields: unclearFields });
    if (rawClass && !values.classId) flags.push({ kind: "unknownClass" });

    const sameId = values.nationalId ? (rowsById.get(values.nationalId) ?? []) : [];
    if (sameId.length > 1) {
      flags.push({ kind: "duplicateInFile", otherRows: sameId.filter((other) => other !== row.sourceRow) });
    }

    // Who this row is: an existing student, or a new one.
    let existing: ExistingStudent | undefined;
    const match = findStudentMatch(
      { nationalId: values.nationalId, name: values.name, classId: values.classId },
      context.students,
    );
    if (match.kind === "byNationalId") existing = match.student;
    if (match.kind === "maybe") {
      existing = match.candidates.find((candidate) => candidate.id === decision.sameAs);
      if (!existing && !decision.asNew) {
        flags.push({
          kind: "maybeSameStudent",
          candidates: match.candidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            className: context.classes.find((c) => c.id === candidate.classId)?.name ?? "",
          })),
        });
      }
    }

    const rejected = decision.rejectedChanges ?? [];
    const changes: ReviewedChange[] = existing
      ? studentChanges(values, existing, context.classes).map((change) => ({
          ...change,
          accepted: !rejected.includes(change.field),
        }))
      : [];

    // The parent: found by phone, or new, and named in the row.
    let parent: ParentPlan = { status: "none" };
    const rawParentPhone = row.values.parentPhone?.trim();
    if (values.parentName && !rawParentPhone) missing.push("parentPhone");
    if (values.parentPhone) {
      const known = findParentByPhone(values.parentPhone, context.parents);
      if (known) {
        parent = { status: "existing", id: known.id, changes: parentChanges(values, known, rejected) };
      } else if (!values.parentName) {
        missing.push("parentName");
      } else {
        parent = { status: "new", phone: values.parentPhone, name: values.parentName, email: values.parentEmail };
      }
    }
    if (existing && parent.status !== "none" && (parent.status === "new" || parent.id !== existing.parentId)) {
      const oldPhone = context.parents.find((p) => p.id === existing.parentId)?.phone ?? "";
      changes.push({ field: "parentPhone", from: oldPhone, to: values.parentPhone ?? "", accepted: !rejected.includes("parentPhone") });
    }

    if (missing.length) flags.unshift({ kind: "requiredMissing", fields: missing });

    const missingOptional = OPTIONAL_FIELDS.filter(
      ([field, key]) => values[key] === undefined && !unclearFields.includes(field) && !(existing && existing[key]),
    ).map(([field]) => field);
    if (missingOptional.length) flags.push({ kind: "missingOptional", fields: missingOptional });

    const accepted = [...changes, ...(parent.status === "existing" ? parent.changes : [])].some((c) => c.accepted);
    return {
      ...base,
      student: values,
      status: existing ? (accepted ? "update" : "noChanges") : "new",
      ...(existing && { existingId: existing.id }),
      changes,
      parent,
      flags,
      canSave: !flags.some(isBlocking),
    };
  });
};
