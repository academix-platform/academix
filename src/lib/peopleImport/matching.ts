// Finding the people an import row already describes, so nobody is added
// twice, and listing what an import would change. Pure rules, no database.

import type { UserSex } from "@prisma/client";

import type { PersonField, StudentField, TeacherField } from "./columns";

export type SchoolClass = { id: number; name: string; gradeId: number; capacity: number; studentCount: number };

export type ExistingStudent = {
  id: string;
  name: string;
  nationalId: string | null;
  classId: number;
  sex: UserSex;
  birthday: Date | null;
  bloodType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  parentId: string | null;
};

export type ExistingParent = { id: string; name: string; phone: string; email: string | null; address: string | null };

export type ExistingTeacher = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sex: UserSex;
  birthday: Date | null;
  bloodType: string | null;
  address: string | null;
  subjectIds: number[];
};

/**
 * A name as people would compare it: spaces collapsed, Latin letters in lower
 * case, and the Arabic spellings that vary between files made the same.
 */
export const normalizeName = (name: string) =>
  name
    .normalize("NFC")
    .replace(/[ً-ٰٟـ]/g, "") // diacritics and tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The school's class with this name, or null. */
export const matchClass = (name: string | undefined, classes: SchoolClass[]) => {
  if (!name?.trim()) return null;
  const wanted = normalizeName(name);
  return classes.find((classItem) => normalizeName(classItem.name) === wanted) ?? null;
};

export type StudentMatch =
  | { kind: "byNationalId"; student: ExistingStudent }
  | { kind: "maybe"; candidates: ExistingStudent[] }
  | { kind: "none" };

/**
 * Finds the student a row describes: by national ID, or, for old students
 * without one, offers those with the same name and class for the admin to
 * confirm. Never matches by name alone.
 */
export const findStudentMatch = (
  row: { nationalId: string | null | undefined; name: string | undefined; classId: number | null | undefined },
  students: ExistingStudent[],
): StudentMatch => {
  if (row.nationalId) {
    const byId = students.find((student) => student.nationalId === row.nationalId);
    if (byId) return { kind: "byNationalId", student: byId };
  }
  if (!row.name || !row.classId) return { kind: "none" };

  const name = normalizeName(row.name);
  const candidates = students.filter(
    (student) => student.nationalId === null && student.classId === row.classId && normalizeName(student.name) === name,
  );
  return candidates.length ? { kind: "maybe", candidates } : { kind: "none" };
};

/** The same phone means the same parent. */
export const findParentByPhone = (phone: string | undefined, parents: ExistingParent[]) =>
  (phone && parents.find((parent) => parent.phone === phone)) || null;

/** A teacher is found by email, ignoring case, or by phone. */
export const findTeacherMatch = <T extends { email: string | null; phone: string | null }>(
  row: { email?: string; phone?: string },
  teachers: T[],
): T | null => {
  const email = row.email?.toLowerCase();
  return (
    (email && teachers.find((teacher) => teacher.email?.toLowerCase() === email)) ||
    (row.phone && teachers.find((teacher) => teacher.phone === row.phone)) ||
    null
  );
};

export type Change<F extends PersonField = StudentField> = { field: F; from: string; to: string };

export type ParsedStudentValues = {
  name?: string;
  nationalId?: string;
  classId?: number;
  sex?: UserSex;
  birthday?: Date;
  bloodType?: string;
  address?: string;
  phone?: string;
  email?: string;
};

const dateText = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : "");

/**
 * What saving a row would change on an existing student. A field the row
 * leaves empty is never a change, so an empty cell can't erase anything.
 */
export const studentChanges = (
  row: ParsedStudentValues,
  existing: ExistingStudent,
  classes: SchoolClass[],
): Change[] => {
  const className = (id: number | null | undefined) => classes.find((c) => c.id === id)?.name ?? "";
  const candidates: [StudentField, string | undefined, string, (a: string, b: string) => boolean][] = [
    ["studentName", row.name, existing.name, (a, b) => normalizeName(a) === normalizeName(b)],
    ["nationalId", row.nationalId, existing.nationalId ?? "", (a, b) => a === b],
    ["className", row.classId ? className(row.classId) : undefined, className(existing.classId), (a, b) => a === b],
    ["sex", row.sex, existing.sex, (a, b) => a === b],
    ["birthday", row.birthday ? dateText(row.birthday) : undefined, dateText(existing.birthday), (a, b) => a === b],
    ["bloodType", row.bloodType, existing.bloodType ?? "", (a, b) => a === b],
    ["address", row.address, existing.address ?? "", (a, b) => a.trim() === b.trim()],
    ["studentPhone", row.phone, existing.phone ?? "", (a, b) => a === b],
    ["studentEmail", row.email, existing.email ?? "", (a, b) => a.toLowerCase() === b.toLowerCase()],
  ];

  return candidates.flatMap(([field, to, from, same]) =>
    to === undefined || to === "" || same(to, from) ? [] : [{ field, from, to }],
  );
};

export type ParsedTeacherValues = {
  name?: string;
  email?: string;
  phone?: string;
  sex?: UserSex;
  birthday?: Date;
  bloodType?: string;
  address?: string;
};

/**
 * What saving a row would change on an existing teacher. A field the row
 * leaves empty is never a change, so an empty cell can't erase anything.
 */
export const teacherChanges = (row: ParsedTeacherValues, existing: ExistingTeacher): Change<TeacherField>[] => {
  const candidates: [TeacherField, string | undefined, string, (a: string, b: string) => boolean][] = [
    ["teacherName", row.name, existing.name, (a, b) => normalizeName(a) === normalizeName(b)],
    ["email", row.email, existing.email ?? "", (a, b) => a.toLowerCase() === b.toLowerCase()],
    ["phone", row.phone, existing.phone ?? "", (a, b) => a === b],
    ["sex", row.sex, existing.sex, (a, b) => a === b],
    ["birthday", row.birthday ? dateText(row.birthday) : undefined, dateText(existing.birthday), (a, b) => a === b],
    ["bloodType", row.bloodType, existing.bloodType ?? "", (a, b) => a === b],
    ["address", row.address, existing.address ?? "", (a, b) => a.trim() === b.trim()],
  ];

  return candidates.flatMap(([field, to, from, same]) =>
    to === undefined || to === "" || same(to, from) ? [] : [{ field, from, to }],
  );
};
