import "server-only";
import type { PrismaClient, UserSex } from "@prisma/client";

import { updateAccount, withNewAccount, type ClerkUsers } from "./accounts";

// Creating and updating a teacher, shared by the teacher form and the import.
// A plain module, not a "use server" file, so none of it can be called from
// the browser. Every lookup is scoped to the admin's school.

export type TeacherDb = Pick<PrismaClient, "teacher" | "subject" | "class">;

export type TeacherDeps = { db: TeacherDb; clerk: ClerkUsers };

export type TeacherInput = {
  username: string;
  password?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  img?: string | null;
  bloodType?: string | null;
  sex: UserSex;
  birthday?: Date | null;
  subjectIds: number[];
};

export type TeacherProblem = "noSubjects" | "subjectNotFound" | "noClasses" | "teacherNotFound";

type Refused = { ok: false; problem: TeacherProblem };

/** The teacher's own fields. The password is never among them: it lives in Clerk only. */
const teacherFields = (input: TeacherInput) => ({
  username: input.username,
  name: input.name,
  email: input.email || null,
  phone: input.phone || null,
  address: input.address || null,
  img: input.img || null,
  bloodType: input.bloodType || null,
  sex: input.sex,
  birthday: input.birthday ?? null,
});

/**
 * The subjects to link and the classes that come with them: every class of
 * the subjects' grades, as the teacher form has always done. Refuses a
 * subject outside the school, and subjects whose grades have no classes.
 */
const subjectLinks = async (
  db: TeacherDb,
  schoolId: number,
  wanted: number[],
): Promise<{ ok: true; subjectIds: number[]; classIds: number[] } | Refused> => {
  const subjectIds = [...new Set(wanted)];
  if (subjectIds.length === 0) return { ok: true, subjectIds: [], classIds: [] };

  const subjects = await db.subject.findMany({
    where: { id: { in: subjectIds }, schoolId },
    select: { id: true, gradeId: true },
  });
  if (subjects.length !== subjectIds.length) return { ok: false, problem: "subjectNotFound" };

  const classes = await db.class.findMany({
    where: { schoolId, gradeId: { in: [...new Set(subjects.map((subject) => subject.gradeId))] } },
    select: { id: true },
  });
  if (classes.length === 0) return { ok: false, problem: "noClasses" };

  return { ok: true, subjectIds, classIds: classes.map((classItem) => classItem.id) };
};

const connect = (ids: number[]) => ids.map((id) => ({ id }));

/**
 * Creates the teacher's login, then the teacher with their subjects and
 * classes. If the teacher can't be saved, the login is deleted. Only the
 * import may create a teacher without subjects. Returns why nothing was
 * created when a check fails, and throws when Clerk or the database fails.
 */
export const createTeacherWith = async (
  { db, clerk }: TeacherDeps,
  schoolId: number,
  input: TeacherInput,
  { allowNoSubjects = false }: { allowNoSubjects?: boolean } = {},
): Promise<{ ok: true; id: string } | Refused> => {
  if (input.subjectIds.length === 0 && !allowNoSubjects) return { ok: false, problem: "noSubjects" };
  const links = await subjectLinks(db, schoolId, input.subjectIds);
  if (!links.ok) return links;

  const { userId } = await withNewAccount(
    clerk,
    { username: input.username, password: input.password, name: input.name, role: "teacher" },
    (teacherId) =>
      db.teacher.create({
        data: {
          id: teacherId,
          schoolId,
          ...teacherFields(input),
          subjects: { connect: connect(links.subjectIds) },
          classes: { connect: connect(links.classIds) },
        },
      }),
  );

  return { ok: true, id: userId };
};

/**
 * Updates a teacher in the admin's school and their login, replacing their
 * subjects and classes, as the teacher form does. Checks the teacher and
 * subjects belong to the school before touching the login. A blank password
 * keeps the current one.
 */
export const updateTeacherWith = async (
  { db, clerk }: TeacherDeps,
  schoolId: number,
  input: TeacherInput & { id: string },
): Promise<{ ok: true } | Refused> => {
  const existing = await db.teacher.findFirst({ where: { id: input.id, schoolId }, select: { id: true } });
  if (!existing) return { ok: false, problem: "teacherNotFound" };

  if (input.subjectIds.length === 0) return { ok: false, problem: "noSubjects" };
  const links = await subjectLinks(db, schoolId, input.subjectIds);
  if (!links.ok) return links;

  await updateAccount(clerk, input.id, {
    username: input.username,
    password: input.password,
    name: input.name,
    role: "teacher",
  });

  await db.teacher.update({
    where: { id: input.id, schoolId },
    data: {
      ...teacherFields(input),
      subjects: { set: connect(links.subjectIds) },
      classes: { set: connect(links.classIds) },
    },
  });
  return { ok: true };
};

export type TeacherChanges = {
  /** Only the fields to change. A field left out stays as it is. */
  fields?: Partial<Pick<TeacherInput, "name" | "email" | "phone" | "address" | "bloodType" | "sex" | "birthday">>;
  /** Subjects to add, with their classes. None are removed. */
  addSubjectIds?: number[];
};

/**
 * Changes some of a teacher's fields and adds subjects, for the import. The
 * login is renamed only when the name changes, and its password is never set.
 */
export const changeTeacherWith = async (
  { db, clerk }: TeacherDeps,
  schoolId: number,
  id: string,
  { fields = {}, addSubjectIds = [] }: TeacherChanges,
): Promise<{ ok: true } | Refused> => {
  const existing = await db.teacher.findFirst({ where: { id, schoolId }, select: { id: true, username: true } });
  if (!existing) return { ok: false, problem: "teacherNotFound" };

  const links = await subjectLinks(db, schoolId, addSubjectIds);
  if (!links.ok) return links;

  if (fields.name) {
    await updateAccount(clerk, id, { username: existing.username, name: fields.name, role: "teacher" });
  }

  await db.teacher.update({
    where: { id, schoolId },
    data: {
      ...fields,
      ...(links.subjectIds.length && {
        subjects: { connect: connect(links.subjectIds) },
        classes: { connect: connect(links.classIds) },
      }),
    },
  });
  return { ok: true };
};
