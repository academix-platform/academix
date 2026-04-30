"use server";

import { TeacherSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import {
  CurrentState,
  requireActionAccess,
  errorResult,
  isClerkUserNotFoundError,
  successResult,
  deleteLessonGraph,
} from "./helpers";

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  let createdUserId: string | null = null;

  const subjectClassPairs =
    data.subjectClassPairs ??
    (data.subjects ?? []).map((subjectId) => ({ subjectId }));

  const subjectIds = Array.from(
    new Set(subjectClassPairs.map((pair) => Number(pair.subjectId))),
  ).filter((id) => !Number.isNaN(id));

  if (subjectIds.length === 0) {
    return {
      success: false,
      error: true,
      message: "Select at least one subject.",
    };
  }

  const selectedSubjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds }, schoolId: access.schoolId },
    select: { gradeId: true },
  });

  const selectedClasses = await prisma.class.findMany({
    where: { schoolId: access.schoolId },
    select: { id: true, gradeId: true },
  });

  const selectedSubjectGrades = new Set<number>();
  for (const subject of selectedSubjects) {
    selectedSubjectGrades.add(subject.gradeId);
  }

  const classIds = selectedClasses
    .filter((cls) => selectedSubjectGrades.has(cls.gradeId))
    .map((cls) => cls.id);

  if (classIds.length === 0) {
    return {
      success: false,
      error: true,
      message: "No classes found for the selected subject grades.",
    };
  }

  try {
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "teacher" },
    });
    createdUserId = user.id;

    await prisma.teacher.create({
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
        subjects: {
          connect: subjectIds.map((subjectId) => ({ id: subjectId })),
        },
        classes: {
          connect: classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/teachers"]);
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

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  if (!data.id) {
    return { success: false, error: true, message: "Teacher id is required." };
  }

  try {
    const existingTeacher = await prisma.teacher.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existingTeacher) {
      return { success: false, error: true, message: "Teacher not found." };
    }

    const subjectClassPairs =
      data.subjectClassPairs ??
      (data.subjects ?? []).map((subjectId) => ({ subjectId }));

    const subjectIds = Array.from(
      new Set(subjectClassPairs.map((pair) => Number(pair.subjectId))),
    ).filter((id) => !Number.isNaN(id));

    if (subjectIds.length === 0) {
      return {
        success: false,
        error: true,
        message: "Select at least one subject.",
      };
    }

    const selectedSubjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds }, schoolId: access.schoolId },
      select: { gradeId: true },
    });

    const selectedClasses = await prisma.class.findMany({
      where: { schoolId: access.schoolId },
      select: { id: true, gradeId: true },
    });

    const selectedSubjectGrades = new Set<number>();
    for (const subject of selectedSubjects) {
      selectedSubjectGrades.add(subject.gradeId);
    }

    const classIds = selectedClasses
      .filter((cls) => selectedSubjectGrades.has(cls.gradeId))
      .map((cls) => cls.id);

    if (classIds.length === 0) {
      return {
        success: false,
        error: true,
        message: "No classes found for the selected subject grades.",
      };
    }

    await (
      await clerkClient()
    ).users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.update({
      where: { id: data.id },
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
        subjects: {
          set: subjectIds.map((subjectId) => ({ id: subjectId })),
        },
        classes: {
          set: classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/teachers"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid teacher id." };

  try {
    try {
      await (await clerkClient()).users.deleteUser(id);
    } catch (err) {
      if (!isClerkUserNotFoundError(err)) {
        throw err;
      }
    }

    await prisma.$transaction(async (tx) => {
      const lessonIds = (
        await tx.lesson.findMany({
          where: { teacherId: id, schoolId: access.schoolId },
          select: { id: true },
        })
      ).map((lesson) => lesson.id);

      await tx.class.updateMany({
        where: { supervisorId: id, schoolId: access.schoolId },
        data: { supervisorId: null },
      });

      await deleteLessonGraph(tx, lessonIds);

      await tx.teacher.deleteMany({
        where: { id, schoolId: access.schoolId },
      });
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
