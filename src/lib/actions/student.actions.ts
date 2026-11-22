"use server";
import { sendAccountEmail } from "../mail";
import { StudentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { createStudentWith, updateStudentWith, type StudentProblem } from "../people/students";
import { STUDENT_NATIONAL_ID_MESSAGES } from "../people/studentNationalId";
import {
  CurrentState,
  errorResult,
  getRequiredAcademicYearId,
  isClerkUserNotFoundError,
  requireActionAccess,
  successResult,
} from "./helpers";

const STUDENT_MESSAGES: Record<StudentProblem, string> = {
  ...STUDENT_NATIONAL_ID_MESSAGES,
  classNotFound: "Class not found.",
  classFull: "The selected class has reached its capacity.",
  parentNotFound: "Parent not found.",
  studentNotFound: "Student not found.",
};

const NATIONAL_ID_PROBLEMS = new Set<StudentProblem>(
  Object.keys(STUDENT_NATIONAL_ID_MESSAGES) as StudentProblem[],
);

/** The form shows national ID problems in the admin's language, by their code. */
const refused = (problem: StudentProblem) => ({
  success: false,
  error: true,
  message: STUDENT_MESSAGES[problem],
  ...(NATIONAL_ID_PROBLEMS.has(problem) && { code: problem }),
});

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const created = await createStudentWith(
      {
        db: prisma,
        clerk: (await clerkClient()).users,
        academicYearId: getRequiredAcademicYearId,
      },
      access.schoolId,
      data,
    );
    if (!created.ok) return refused(created.problem);

    // The student exists now, so a failed email must not undo it.
    if (data.email && data.password) {
      try {
        await sendAccountEmail(data.email, data.username, data.password);
      } catch (err) {
        console.error("createStudent: account email failed", err instanceof Error ? err.name : "unknown error");
      }
    }

    return successResult(["/list/students"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Student id is required.",
    };
  }

  try {
    const updated = await updateStudentWith(
      { db: prisma, clerk: (await clerkClient()).users },
      access.schoolId,
      { ...data, id: data.id },
    );
    if (!updated.ok) return refused(updated.problem);

    return successResult(["/list/students"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = data.get("id") as string;
  const deleteParent = data.get("deleteParent") === "true";

  if (!id) {
    return {
      success: false,
      error: true,
      message: "Invalid student id.",
    };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id, schoolId: access.schoolId },
      select: { parentId: true },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        message: "Student not found.",
      };
    }

    const parentId = student.parentId ?? null;

    if (deleteParent && parentId) {
      const siblingCount = await prisma.student.count({
        where: { parentId, schoolId: access.schoolId },
      });

      if (siblingCount > 1) {
        return {
          success: false,
          error: true,
          message:
            "This parent has more than one student, so only the student can be deleted.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentAcademicYear.deleteMany({
        where: { studentId: id, schoolId: access.schoolId },
      });

      await tx.attendance.deleteMany({
        where: { studentId: id, schoolId: access.schoolId },
      });

      await tx.result.deleteMany({
        where: { studentId: id, schoolId: access.schoolId },
      });

      await tx.student.deleteMany({
        where: { id, schoolId: access.schoolId },
      });

      if (deleteParent && parentId) {
        await tx.parent.deleteMany({
          where: { id: parentId, schoolId: access.schoolId },
        });
      }
    });

    try {
      await (await clerkClient()).users.deleteUser(id);
    } catch (err) {
      if (!isClerkUserNotFoundError(err)) {
        throw err;
      }
    }

    if (deleteParent && parentId) {
      try {
        await (await clerkClient()).users.deleteUser(parentId);
      } catch (err) {
        if (!isClerkUserNotFoundError(err)) {
          throw err;
        }
      }
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};