import "server-only";
import type { PrismaClient, StudentStatus, UserSex } from "@prisma/client";

import { updateAccount, withNewAccount, type ClerkUsers } from "./accounts";
import { checkStudentNationalId, type StudentNationalIdProblem } from "./studentNationalId";

// Creating and updating a student, shared by the student form and the import.
// A plain module, not a "use server" file, so none of it can be called from
// the browser. Every lookup is scoped to the admin's school.

export type StudentDb = Pick<PrismaClient, "student" | "class" | "parent" | "studentAcademicYear" | "$transaction">;

export type StudentDeps = {
  db: StudentDb;
  clerk: ClerkUsers;
  /** The school's current academic year, which new students are enrolled in. */
  academicYearId: (schoolId: number) => Promise<number>;
};

export type StudentInput = {
  username: string;
  password?: string;
  name: string;
  nationalId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  img?: string | null;
  bloodType?: string | null;
  sex: UserSex;
  birthday?: Date | null;
  gradeId: number;
  classId: number;
  parentId?: string | null;
  status?: StudentStatus;
};

export type StudentProblem =
  | StudentNationalIdProblem
  | "classNotFound"
  | "classFull"
  | "parentNotFound"
  | "studentNotFound";

type Refused = { ok: false; problem: StudentProblem };

/** The student's own fields. The password is never among them: it lives in Clerk only. */
const studentFields = (input: StudentInput, nationalId: string) => ({
  username: input.username,
  name: input.name,
  nationalId,
  email: input.email || null,
  phone: input.phone || null,
  address: input.address || null,
  img: input.img || null,
  bloodType: input.bloodType || null,
  sex: input.sex,
  birthday: input.birthday ?? null,
  gradeId: input.gradeId,
  classId: input.classId,
});

const parentInSchool = async (db: StudentDb, schoolId: number, parentId?: string | null) =>
  !parentId || (await db.parent.findFirst({ where: { id: parentId, schoolId }, select: { id: true } })) !== null;

/**
 * Creates the student's login, then the student and their enrollment in the
 * current year together. If the rows can't be saved, the login is deleted.
 * Returns why nothing was created when a check fails, and throws when Clerk
 * or the database fails.
 */
export const createStudentWith = async (
  { db, clerk, academicYearId }: StudentDeps,
  schoolId: number,
  input: StudentInput,
): Promise<{ ok: true; id: string; nationalId: string } | Refused> => {
  const nationalId = await checkStudentNationalId(db, { schoolId, nationalId: input.nationalId });
  if (!nationalId.ok) return nationalId;

  if (!(await parentInSchool(db, schoolId, input.parentId))) return { ok: false, problem: "parentNotFound" };

  // A class from another school would put this student, and their enrollment, in it.
  const classItem = await db.class.findUnique({
    where: { id: input.classId, schoolId },
    include: { _count: { select: { students: true } } },
  });
  if (!classItem) return { ok: false, problem: "classNotFound" };
  if (classItem._count.students >= classItem.capacity) return { ok: false, problem: "classFull" };

  // Look up the year first, so a missing year stops before anything is created.
  const yearId = await academicYearId(schoolId);

  const { userId } = await withNewAccount(
    clerk,
    { username: input.username, password: input.password, name: input.name, role: "student" },
    (studentId) =>
      db.$transaction(async (tx) => {
        await tx.student.create({
          data: {
            id: studentId,
            schoolId,
            ...studentFields(input, nationalId.id),
            parentId: input.parentId || null,
            status: input.status || "ACTIVE",
          },
        });
        await tx.studentAcademicYear.create({
          data: {
            studentId,
            schoolId,
            academicYearId: yearId,
            gradeId: input.gradeId,
            classId: input.classId,
            performanceStatus: null,
          },
        });
      }),
  );

  return { ok: true, id: userId, nationalId: nationalId.id };
};

/**
 * Updates a student in the admin's school and their login. Checks the student,
 * class and parent belong to the school before touching the login. A blank
 * password keeps the current one.
 */
export const updateStudentWith = async (
  { db, clerk }: Pick<StudentDeps, "db" | "clerk">,
  schoolId: number,
  input: StudentInput & { id: string },
): Promise<{ ok: true } | Refused> => {
  const existing = await db.student.findFirst({ where: { id: input.id, schoolId }, select: { id: true } });
  if (!existing) return { ok: false, problem: "studentNotFound" };

  // Every student needs an ID, so editing an old student without one asks for it.
  const nationalId = await checkStudentNationalId(db, {
    schoolId,
    nationalId: input.nationalId,
    studentId: input.id,
  });
  if (!nationalId.ok) return nationalId;

  if (!(await parentInSchool(db, schoolId, input.parentId))) return { ok: false, problem: "parentNotFound" };

  const classItem = await db.class.findUnique({ where: { id: input.classId, schoolId }, select: { id: true } });
  if (!classItem) return { ok: false, problem: "classNotFound" };

  await updateAccount(clerk, input.id, {
    username: input.username,
    password: input.password,
    name: input.name,
    role: "student",
  });

  const updated = await db.student.updateMany({
    where: { id: input.id, schoolId },
    data: {
      ...studentFields(input, nationalId.id),
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });
  return updated.count === 0 ? { ok: false, problem: "studentNotFound" } : { ok: true };
};
