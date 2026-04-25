"use server";

import { TeacherSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import {
  CurrentState,
  errorResult,
  isClerkUserNotFoundError,
  successResult,
  deleteLessonGraph,
} from "./helpers";

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
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

  const getGradeNumberFromSubjectName = (name: string) => {
    const match = /-G(\d+)$/i.exec(name.trim());
    return match ? Number(match[1]) : null;
  };

  const getGradeNumberFromClassName = (name: string) => {
    const match = /^(\d+)/.exec(name.trim());
    return match ? Number(match[1]) : null;
  };

  const selectedSubjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });

  const selectedClasses = await prisma.class.findMany({
    select: { id: true, name: true },
  });

  const subjectGradeMap = new Map<number, number | null>();
  for (const subject of selectedSubjects) {
    subjectGradeMap.set(
      subject.id,
      getGradeNumberFromSubjectName(subject.name),
    );
  }

  const selectedSubjectGrades = new Set<number>();
  for (const grade of subjectGradeMap.values()) {
    if (grade !== null) selectedSubjectGrades.add(grade);
  }

  const classIds = selectedClasses
    .filter((cls) =>
      selectedSubjectGrades.has(getGradeNumberFromClassName(cls.name) ?? -1),
    )
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
  if (!data.id) {
    return { success: false, error: true, message: "Teacher id is required." };
  }

  try {
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

    const getGradeNumberFromSubjectName = (name: string) => {
      const match = /-G(\d+)$/i.exec(name.trim());
      return match ? Number(match[1]) : null;
    };

    const getGradeNumberFromClassName = (name: string) => {
      const match = /^(\d+)/.exec(name.trim());
      return match ? Number(match[1]) : null;
    };

    const selectedSubjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true },
    });

    const selectedClasses = await prisma.class.findMany({
      select: { id: true, name: true },
    });

    const subjectGradeMap = new Map<number, number | null>();
    for (const subject of selectedSubjects) {
      subjectGradeMap.set(
        subject.id,
        getGradeNumberFromSubjectName(subject.name),
      );
    }

    const selectedSubjectGrades = new Set<number>();
    for (const grade of subjectGradeMap.values()) {
      if (grade !== null) selectedSubjectGrades.add(grade);
    }

    const classIds = selectedClasses
      .filter((cls) =>
        selectedSubjectGrades.has(getGradeNumberFromClassName(cls.name) ?? -1),
      )
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
          where: { teacherId: id },
          select: { id: true },
        })
      ).map((lesson) => lesson.id);

      await tx.class.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      });

      await deleteLessonGraph(tx, lessonIds);

      await tx.teacher.delete({
        where: { id },
      });
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
