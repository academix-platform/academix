import type { Prisma } from "@prisma/client";

// Who may open a subject page, and which of its content they see.
// Kept free of database calls so the rules can be unit-tested.

type Role = string | null | undefined;

/**
 * Extra conditions on `Subject` for the subject details page.
 * - admin: any subject in the school (the caller adds `schoolId`).
 * - teacher: only subjects they are assigned to.
 * - student: only subjects of their own grade.
 * - parent: only subjects of a grade one of their children is in.
 * Any other role matches nothing.
 */
export function subjectAccessWhere(
  role: Role,
  userId: string | null | undefined,
): Prisma.SubjectWhereInput {
  if (role === "admin") return {};
  if (!userId) return { id: -1 };

  switch (role) {
    case "teacher":
      return { teachers: { some: { id: userId } } };
    case "student":
      return { grade: { students: { some: { id: userId } } } };
    case "parent":
      return { grade: { students: { some: { parentId: userId } } } };
    default:
      return { id: -1 };
  }
}

/**
 * Conditions on assignments and exams shown on the subject page:
 * the current academic year only, and for students and parents only the
 * classes they (or their children) are in.
 */
export function subjectClassContentWhere(
  role: Role,
  userId: string | null | undefined,
  academicYearId: number | null,
): Prisma.AssignmentWhereInput & Prisma.ExamWhereInput {
  // No current year means nothing is "current": show no content.
  if (academicYearId === null) return { id: -1 };

  const where: Prisma.AssignmentWhereInput & Prisma.ExamWhereInput = {
    academicYearId,
  };

  // Content is linked to a class directly or only through its lesson
  // (older rows have no classId), so both paths count.
  const inClass = (students: Prisma.StudentWhereInput) => {
    const classWhere = { students: { some: students } };
    where.OR = [{ class: classWhere }, { lesson: { class: classWhere } }];
  };

  if (role === "student") {
    inClass({ id: userId ?? "" });
  } else if (role === "parent") {
    inClass({ parentId: userId ?? "" });
  }

  return where;
}

/** Study materials shown on the subject page: the current academic year only. */
export function subjectMaterialWhere(
  academicYearId: number | null,
): Prisma.StudyMaterialWhereInput {
  return academicYearId === null ? { id: -1 } : { academicYearId };
}

/**
 * Whether every requested teacher id was found in the caller's school.
 * Duplicates in the request are ignored.
 */
export function allTeachersFound(
  requestedIds: readonly string[],
  foundIds: readonly string[],
): boolean {
  const found = new Set(foundIds);
  return requestedIds.every((id) => found.has(id));
}
