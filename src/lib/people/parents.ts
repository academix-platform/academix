import "server-only";
import type { PrismaClient } from "@prisma/client";

import { updateAccount, withNewAccount, type ClerkUsers } from "./accounts";

// Creating and updating a parent, shared by the parent form and the import.
// A plain module, not a "use server" file, so none of it can be called from
// the browser. Every lookup is scoped to the admin's school.

export type ParentDb = Pick<PrismaClient, "parent" | "student">;

export type ParentDeps = { db: ParentDb; clerk: ClerkUsers };

export type ParentInput = {
  username: string;
  password?: string;
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  /** The parent's children. Left out on an update, the links stay as they are. */
  studentIds?: string[];
};

export type ParentProblem = "noStudents" | "studentNotFound" | "parentNotFound";

type Refused = { ok: false; problem: ParentProblem };

/** The parent's own fields. The password is never among them: it lives in Clerk only. */
const parentFields = (input: ParentInput) => ({
  username: input.username,
  name: input.name,
  email: input.email || null,
  phone: input.phone,
  address: input.address || null,
});

/** True when every child is a student in the school, so no parent sees another school's student. */
const studentsInSchool = async (db: ParentDb, schoolId: number, studentIds: string[]) => {
  const unique = [...new Set(studentIds)];
  const found = await db.student.count({ where: { id: { in: unique }, schoolId } });
  return found === unique.length;
};

/**
 * Creates the parent's login, then the parent linked to their children. If the
 * parent can't be saved, the login is deleted. Throws when Clerk or the
 * database fails.
 */
export const createParentWith = async (
  { db, clerk }: ParentDeps,
  schoolId: number,
  input: ParentInput,
): Promise<{ ok: true; id: string } | Refused> => {
  const studentIds = input.studentIds ?? [];
  if (studentIds.length === 0) return { ok: false, problem: "noStudents" };
  if (!(await studentsInSchool(db, schoolId, studentIds))) return { ok: false, problem: "studentNotFound" };

  const { userId } = await withNewAccount(
    clerk,
    { username: input.username, password: input.password, name: input.name, role: "parent" },
    (parentId) =>
      db.parent.create({
        data: {
          id: parentId,
          schoolId,
          ...parentFields(input),
          students: { connect: studentIds.map((id) => ({ id })) },
        },
      }),
  );

  return { ok: true, id: userId };
};

/**
 * Updates a parent in the admin's school and their login. Checks the parent and
 * children belong to the school before touching the login. A blank password
 * keeps the current one.
 */
export const updateParentWith = async (
  { db, clerk }: ParentDeps,
  schoolId: number,
  input: ParentInput & { id: string },
): Promise<{ ok: true } | Refused> => {
  const existing = await db.parent.findFirst({ where: { id: input.id, schoolId }, select: { id: true } });
  if (!existing) return { ok: false, problem: "parentNotFound" };

  if (input.studentIds && !(await studentsInSchool(db, schoolId, input.studentIds))) {
    return { ok: false, problem: "studentNotFound" };
  }

  await updateAccount(clerk, input.id, {
    username: input.username,
    password: input.password,
    name: input.name,
    role: "parent",
  });

  await db.parent.update({
    where: { id: input.id },
    data: {
      ...parentFields(input),
      ...(input.studentIds && { students: { set: input.studentIds.map((id) => ({ id })) } }),
    },
  });
  return { ok: true };
};
