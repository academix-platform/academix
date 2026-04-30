"use server";

import { StudentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import {
  CurrentState,
  errorResult,
  getRequiredAcademicYearId,
  isClerkUserNotFoundError,
  requireActionAccess,
  successResult,
} from "./helpers";

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  let createdUserId: string | null = null;

  try {
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId, schoolId: access.schoolId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return {
        success: false,
        error: true,
        message: "The selected class has reached its capacity.",
      };
    }

    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "student" },
    });
    createdUserId = user.id;

    await prisma.student.create({
      data: {
        id: createdUserId,
        schoolId: access.schoolId,
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        ...(data.parentId
          ? { parent: { connect: { id: data.parentId } } }
          : {}),
        status: data.status || "ACTIVE",
      } as any,
    });

    // Automatically enroll student in the current academic year
    const currentAcademicYearId = await getRequiredAcademicYearId(
      access.schoolId,
    );
    if (currentAcademicYearId) {
      await prisma.studentAcademicYear.create({
        data: {
          studentId: createdUserId,
          schoolId: access.schoolId,
          academicYearId: currentAcademicYearId,
          gradeId: data.gradeId,
          classId: data.classId,
          performanceStatus: null,
        },
      });
    }

    return successResult(["/list/students"]);
  } catch (err) {
    if (createdUserId) {
      try {
        await (await clerkClient()).users.deleteUser(createdUserId);
      } catch {
        // Best-effort rollback for partial user creation.
      }
    }
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
    return { success: false, error: true, message: "Student id is required." };
  }

  try {
    await (
      await clerkClient()
    ).users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      publicMetadata: { role: "student" },
    });

    const updated = await prisma.student.updateMany({
      where: { id: data.id, schoolId: access.schoolId },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        ...(data.parentId ? { parentId: data.parentId } : {}),
        ...(data.status && { status: data.status }),
      },
    });
    if (updated.count === 0) {
      return { success: false, error: true, message: "Student not found." };
    }

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
  if (!id)
    return { success: false, error: true, message: "Invalid student id." };

  try {
    const student = await prisma.student.findUnique({
      where: { id, schoolId: access.schoolId },
      select: { parentId: true },
    });

    const parentId = student?.parentId ?? null;

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
      await tx.student.deleteMany({ where: { id, schoolId: access.schoolId } });

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
