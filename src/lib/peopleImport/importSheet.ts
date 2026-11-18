// The import sheet: the school's people written in the import's own columns,
// for the admin to fill in or change and upload again. A sheet whose headers
// are exactly these columns is read without asking the column reader.
// Pure rules, no database.

import { fieldsFor, type ColumnChoice, type ImportKind, type PersonField } from "./columns";
import { normalizeName } from "./matching";

/** Each field's column header, in the admin's language. */
export type FieldLabels = Record<PersonField, string>;

/** How the sheet writes a sex, in words the import reads back. */
export type SexLabels = { MALE: string; FEMALE: string };

export type SheetStudent = {
  name: string;
  nationalId: string | null;
  className: string | null;
  sex: "MALE" | "FEMALE";
  birthday: Date | null;
  bloodType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  parent: { name: string; phone: string; email: string | null } | null;
};

export type SheetTeacher = {
  name: string;
  email: string | null;
  phone: string | null;
  sex: "MALE" | "FEMALE";
  birthday: Date | null;
  bloodType: string | null;
  address: string | null;
  subjects: { name: string; level: number }[];
};

/** A date as YYYY-MM-DD, the form the import reads. */
const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

const text = (value: string | null | undefined) => value ?? "";

export const studentSheetRows = (students: SheetStudent[], labels: FieldLabels, sexes: SexLabels): string[][] => [
  fieldsFor("students").map((field) => labels[field]),
  ...students.map((student) => [
    student.name,
    text(student.nationalId),
    text(student.className),
    sexes[student.sex],
    day(student.birthday),
    text(student.bloodType),
    text(student.address),
    text(student.phone),
    text(student.email),
    text(student.parent?.name),
    text(student.parent?.phone),
    text(student.parent?.email),
  ]),
];

export const teacherSheetRows = (teachers: SheetTeacher[], labels: FieldLabels, sexes: SexLabels): string[][] => [
  fieldsFor("teachers").map((field) => labels[field]),
  ...teachers.map((teacher) => [
    teacher.name,
    text(teacher.email),
    text(teacher.phone),
    sexes[teacher.sex],
    day(teacher.birthday),
    text(teacher.bloodType),
    text(teacher.address),
    // Each subject with its grade, as the import reads it: "رياضيات 7، علوم 8".
    teacher.subjects.map((subject) => `${subject.name} ${subject.level}`).join("، "),
  ]),
];

/**
 * The column choices for a header row made of the import's own column names,
 * or null when any filled header is something else, for the column reader.
 */
export const mappingFromHeaders = (kind: ImportKind, header: unknown[], labels: FieldLabels): ColumnChoice[] | null => {
  const byLabel = new Map(fieldsFor(kind).map((field) => [normalizeName(labels[field]), field]));
  const mapping: ColumnChoice[] = [];
  const seen = new Set<PersonField>();
  for (const cell of header) {
    const name = normalizeName(typeof cell === "string" ? cell : cell == null ? "" : String(cell));
    if (!name) {
      mapping.push("unknown");
      continue;
    }
    const field = byLabel.get(name);
    if (!field || seen.has(field)) return null;
    seen.add(field);
    mapping.push(field);
  }
  // A sheet needs at least the person's name to be ours.
  const nameField = kind === "students" ? "studentName" : "teacherName";
  return seen.has(nameField) ? mapping : null;
};
