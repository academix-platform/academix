"use server";

import { revalidatePath } from "next/cache";
import {
  AttendanceBulkSchema,
  AnnouncementSchema,
  AssignmentSchema,
  ClassSchema,
  ExamSchema,
  EventSchema,
  LessonSchema,
  LessonScheduleSchema,
  MessageSchema,
  ParentSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { getCurrentRole, getUserId } from "./auth";

type CurrentState = { success: boolean; error: boolean; message?: string };
type ActionResult = { success: boolean; error: boolean; message?: string };

const successResult = (pathsToRevalidate: string[] = []): ActionResult => {
  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }

  return { success: true, error: false };
};

const errorResult = (err: unknown, fallbackMessage?: string): ActionResult => {
  const message = getReadableActionErrorMessage(err);

  return {
    success: false,
    error: true,
    message: message || fallbackMessage || "Something went wrong!",
  };
};

const parseNumericId = (raw: FormDataEntryValue | null): number | null => {
  if (typeof raw !== "string") return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const ensureAdminAccess = async () => {
  const role = await getCurrentRole();

  if (role !== "admin") {
    return {
      success: false,
      error: true,
      message: "You are not allowed to perform this action.",
    } as ActionResult;
  }

  return null;
};

const serializeActionError = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return { raw: err };
  }

  const normalizeErrors = (errors: unknown) => {
    if (!Array.isArray(errors)) return errors;

    return errors.map((item) => {
      if (!item || typeof item !== "object") return item;

      const i = item as {
        code?: string;
        message?: string;
        longMessage?: string;
        meta?: unknown;
      };

      return {
        code: i.code,
        message: i.message,
        longMessage: i.longMessage,
        meta: i.meta,
      };
    });
  };

  const e = err as {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
    meta?: unknown;
    errors?: unknown;
    clerkError?: boolean;
  };

  return {
    name: e.name,
    message: e.message,
    code: e.code,
    meta: e.meta,
    clerkError: e.clerkError,
    errors: normalizeErrors(e.errors),
    stack: e.stack,
  };
};

const getReadableActionErrorMessage = (err: unknown) => {
  const serialized = serializeActionError(err) as {
    message?: string;
    errors?: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
    }>;
  };

  const clerkError = serialized.errors?.[0];

  if (clerkError?.code === "form_password_pwned") {
    return "Please choose a stronger password, try to  include a mix of uppercase and lowercase letters, numbers, and special characters (!, @, #, $, %, &)";
  }

  const rawClerkMessage = clerkError?.longMessage || clerkError?.message || "";
  if (rawClerkMessage.toLowerCase().includes("online data breach")) {
    return "That password may be unsafe. Please choose a different password that you have not used elsewhere.";
  }

  return rawClerkMessage || serialized.message || "Something went wrong!";
};

const isClerkUserNotFoundError = (err: unknown) => {
  const serialized = serializeActionError(err) as {
    message?: string;
    status?: number;
    statusCode?: number;
    errors?: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
    }>;
  };

  const messages = [
    serialized.message,
    serialized.errors?.[0]?.message,
    serialized.errors?.[0]?.longMessage,
    err instanceof Error ? err.message : undefined,
    String(err),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return (
    serialized.status === 404 ||
    serialized.statusCode === 404 ||
    messages.some(
      (message) =>
        message.includes("no user was found with id") ||
        message.includes("user not found") ||
        message.includes("resource not found"),
    )
  );
};

const deleteLessonGraph = async (
  tx: Prisma.TransactionClient,
  lessonIds: number[],
) => {
  if (lessonIds.length === 0) return;

  const exams = await tx.exam.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { id: true },
  });
  const assignments = await tx.assignment.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { id: true },
  });

  const examIds = exams.map((exam) => exam.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  if (examIds.length > 0) {
    await tx.result.deleteMany({
      where: { examId: { in: examIds } },
    });
  }

  if (assignmentIds.length > 0) {
    await tx.result.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
  }

  if (examIds.length > 0) {
    await tx.exam.deleteMany({
      where: { id: { in: examIds } },
    });
  }

  if (assignmentIds.length > 0) {
    await tx.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
  }

  await tx.lesson.deleteMany({
    where: { id: { in: lessonIds } },
  });
};

const normalizeAttendanceDate = (date: Date) => {
  const isoDate = date.toISOString().slice(0, 10);
  return new Date(`${isoDate}T00:00:00.000Z`);
};

////////////////////////////////////////////////////

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    const defaultGrade = await prisma.grade.findFirst({
      orderBy: { level: "asc" },
      select: { id: true },
    });

    if (!defaultGrade) {
      return {
        success: false,
        error: true,
        message: "Create a grade first before creating subjects.",
      };
    }

    await prisma.subject.create({
      data: {
        name: data.name,
        gradeId: defaultGrade.id,
        teachers: {
          connect: data.teachers.map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/subjects"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Subject id is required." };
  }

  try {
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/subjects"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid subject id." };

  try {
    await prisma.subject.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

////////////////////////////////////////////////////

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    await prisma.class.create({
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Class id is required." };
  }

  try {
    await prisma.class.update({
      where: { id: data.id },
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid class id." };

  try {
    await prisma.class.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

////////////////////////////////////////////////////
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
////////////////////////////////////////////////////
export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  let createdUserId: string | null = null;

  try {
    const classItem = await prisma.class.findUnique({
      where: {
        id: data.classId,
      },
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
        parentId: data.parentId,
      },
    });

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

    await prisma.student.update({
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
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    return successResult(["/list/students"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid student id." };

  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.student.delete({
      where: { id: id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
////////////////////////////////////////////////////
export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  let createdUserId: string | null = null;

  try {
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "parent" },
    });
    createdUserId = user.id;

    await prisma.parent.create({
      data: {
        id: createdUserId,
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        students: {
          connect: data.students?.map((studentId: string) => ({
            id: studentId,
          })),
        },
      },
    });

    return successResult(["/list/parents"]);
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

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Parent id is required." };
  }

  try {
    await (
      await clerkClient()
    ).users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        students: {
          set: data.students?.map((studentId: string) => ({
            id: studentId,
          })),
        },
      },
    });

    return successResult(["/list/parents"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid parent id." };

  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.parent.delete({
      where: { id: id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

////////////////////////////////////////////////////

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const saveLessonSchedule = async (
  currentState: CurrentState,
  data: LessonScheduleSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    const selectedEntries = data.entries.filter(
      (entry) => entry.subjectId && entry.subjectId > 0,
    );

    if (selectedEntries.length === 0) {
      return {
        success: false,
        error: true,
        message: "Select at least one subject in the weekly schedule.",
      };
    }

    const getGradeFromClassName = (name?: string) => {
      if (!name) return null;
      const match = /^(\d+)/.exec(name.trim());
      if (!match) return null;
      const grade = Number(match[1]);
      return Number.isNaN(grade) ? null : grade;
    };

    const getGradeFromSubjectName = (name?: string) => {
      if (!name) return null;
      const match = /-G(\d+)$/i.exec(name.trim());
      if (!match) return null;
      const grade = Number(match[1]);
      return Number.isNaN(grade) ? null : grade;
    };

    const subjectIds = Array.from(
      new Set(selectedEntries.map((entry) => Number(entry.subjectId))),
    );

    const [selectedClass, subjects] = await Promise.all([
      prisma.class.findUnique({
        where: { id: data.classId },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: {
          id: true,
          name: true,
          teachers: { select: { id: true } },
        },
      }),
    ]);

    if (!selectedClass) {
      return {
        success: false,
        error: true,
        message: "Selected class was not found.",
      };
    }

    const classGrade = getGradeFromClassName(selectedClass.name);

    const subjectTeacherMap = new Map<number, Set<string>>();

    for (const subject of subjects) {
      const subjectGrade = getGradeFromSubjectName(subject.name);
      if (classGrade !== null && subjectGrade !== classGrade) {
        return {
          success: false,
          error: true,
          message:
            "Only subjects from the selected class grade can be scheduled.",
        };
      }

      const allowedTeacherIds = new Set(
        subject.teachers.map((teacher) => teacher.id),
      );

      if (allowedTeacherIds.size === 0) {
        return {
          success: false,
          error: true,
          message:
            "One or more selected subjects do not have an assigned teacher.",
        };
      }

      subjectTeacherMap.set(subject.id, allowedTeacherIds);
    }

    for (const entry of selectedEntries) {
      const subjectId = Number(entry.subjectId);
      const teacherId = entry.teacherId;

      if (!teacherId) {
        return {
          success: false,
          error: true,
          message: "Teacher is required for each selected subject.",
        };
      }

      const allowedTeacherIds = subjectTeacherMap.get(subjectId);
      if (!allowedTeacherIds || !allowedTeacherIds.has(teacherId)) {
        return {
          success: false,
          error: true,
          message:
            "The selected teacher cannot teach one or more of the selected subjects.",
        };
      }
    }

    const slotStartHour = 7;
    const slotDurationMinutes = 45;
    const selectedSlotKeys = new Set(
      selectedEntries.map((entry) => `${entry.day}-${entry.slot}`),
    );

    const plannedLessons = selectedEntries.map((entry) => ({
      day: entry.day,
      slot: entry.slot,
      subjectId: Number(entry.subjectId),
      teacherId: entry.teacherId!,
    }));

    const plannedTeacherIds = Array.from(
      new Set(plannedLessons.map((entry) => entry.teacherId)),
    );
    const plannedDays = Array.from(
      new Set(plannedLessons.map((entry) => entry.day)),
    );

    const teacherExistingLessons = await prisma.lesson.findMany({
      where: {
        teacherId: { in: plannedTeacherIds },
        day: { in: plannedDays },
        classId: { not: data.classId },
      },
      select: {
        teacherId: true,
        day: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const planned of plannedLessons) {
      const plannedStart = new Date();
      plannedStart.setUTCFullYear(2000, 0, 1);
      const startMinutes = (planned.slot - 1) * slotDurationMinutes;
      plannedStart.setUTCHours(slotStartHour, startMinutes, 0, 0);

      const plannedEnd = new Date(plannedStart);
      plannedEnd.setUTCMinutes(
        plannedEnd.getUTCMinutes() + slotDurationMinutes,
      );

      const hasConflict = teacherExistingLessons.some((lesson) => {
        if (
          lesson.teacherId !== planned.teacherId ||
          lesson.day !== planned.day
        ) {
          return false;
        }

        return plannedStart < lesson.endTime && plannedEnd > lesson.startTime;
      });

      if (hasConflict) {
        return {
          success: false,
          error: true,
          message:
            "Teacher conflict detected: one or more teachers already have a lesson at the same time.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      const existingLessons = await tx.lesson.findMany({
        where: { classId: data.classId },
        select: { id: true, day: true, name: true },
      });

      const existingLessonBySlot = new Map<string, { id: number }>();

      for (const lesson of existingLessons) {
        const match = /lesson\s*(\d+)/i.exec(lesson.name);
        if (!match) continue;

        const slot = Number(match[1]);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) continue;

        const key = `${lesson.day}-${slot}`;
        if (!existingLessonBySlot.has(key)) {
          existingLessonBySlot.set(key, { id: lesson.id });
        }
      }

      const staleLessons = Array.from(existingLessonBySlot.entries())
        .filter(([slotKey]) => !selectedSlotKeys.has(slotKey))
        .map(([, lesson]) => lesson);

      const staleLessonIds = staleLessons.map((lesson) => lesson.id);

      if (staleLessonIds.length > 0) {
        // Delete dependent exams first
        await tx.exam.deleteMany({
          where: { lessonId: { in: staleLessonIds } },
        });

        // Delete dependent assignments
        await tx.assignment.deleteMany({
          where: { lessonId: { in: staleLessonIds } },
        });

        // Finally, delete the stale lessons
        await tx.lesson.deleteMany({
          where: { id: { in: staleLessonIds } },
        });
      }

      for (const entry of selectedEntries) {
        const subjectId = Number(entry.subjectId);
        const teacherId = entry.teacherId!;

        const start = new Date();
        start.setUTCFullYear(2000, 0, 1);
        const startMinutes = (entry.slot - 1) * slotDurationMinutes;
        start.setUTCHours(slotStartHour, startMinutes, 0, 0);

        const end = new Date(start);
        end.setUTCMinutes(end.getUTCMinutes() + slotDurationMinutes);

        const slotKey = `${entry.day}-${entry.slot}`;
        const existingLesson = existingLessonBySlot.get(slotKey);

        if (existingLesson) {
          await tx.lesson.update({
            where: { id: existingLesson.id },
            data: {
              name: `Lesson ${entry.slot}`,
              day: entry.day,
              startTime: start,
              endTime: end,
              classId: data.classId,
              subjectId,
              teacherId,
            },
          });
        } else {
          await tx.lesson.create({
            data: {
              name: `Lesson ${entry.slot}`,
              day: entry.day,
              startTime: start,
              endTime: end,
              classId: data.classId,
              subjectId,
              teacherId,
            },
          });
        }
      }
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Lesson id is required." };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid lesson id." };

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.$transaction(async (tx) => {
      await deleteLessonGraph(tx, [id]);
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

////////////////////////////////////////////////////

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    await prisma.$transaction(
      lessons.map((lesson) =>
        prisma.exam.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: lesson.id,
            classId: lesson.classId,
            subjectId: data.subjectId,
          },
        }),
      ),
    );

    return successResult(["/list/exams"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Exam id is required." };
  }

  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const existingExam = await prisma.exam.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        subjectId: true,
      },
    });

    if (!existingExam) {
      return {
        success: false,
        error: true,
        message: "The exam you are trying to update was not found.",
      };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    const groupExams = await prisma.exam.findMany({
      where: {
        title: existingExam.title,
        startTime: existingExam.startTime,
        endTime: existingExam.endTime,
        subjectId: existingExam.subjectId,
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
      select: { id: true, classId: true },
    });

    const selectedLessonsByClass = new Map<
      number,
      { id: number; classId: number }
    >();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }

    await prisma.$transaction(async (tx) => {
      for (const exam of groupExams) {
        if (exam.classId && !selectedLessonsByClass.has(exam.classId)) {
          await tx.exam.delete({ where: { id: exam.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassExam = groupExams.find(
          (exam) => exam.classId === classId,
        );

        if (existingClassExam) {
          await tx.exam.update({
            where: { id: existingClassExam.id },
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        } else {
          await tx.exam.create({
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        }
      }
    });

    return successResult(["/list/exams"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid exam id." };

  const role = await getCurrentRole();
  const userId = await getUserId();
  try {
    if (role === "teacher") {
      const teacherExam = await prisma.exam.findFirst({
        where: { id, lesson: { teacherId: userId! } },
        select: { id: true },
      });

      if (!teacherExam) {
        return {
          success: false,
          error: true,
          message: "You are not allowed to delete this exam.",
        };
      }
    }

    await prisma.exam.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
////////////////////////////////////////////////////
export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    await prisma.$transaction(
      lessons.map((lesson) =>
        prisma.assignment.create({
          data: {
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            lessonId: lesson.id,
            classId: lesson.classId,
            subjectId: data.subjectId,
          },
        }),
      ),
    );

    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Assignment id is required.",
    };
  }

  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        subjectId: true,
      },
    });

    if (!existingAssignment) {
      return {
        success: false,
        error: true,
        message: "The assignment you are trying to update was not found.",
      };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    const groupAssignments = await prisma.assignment.findMany({
      where: {
        title: existingAssignment.title,
        startDate: existingAssignment.startDate,
        endDate: existingAssignment.endDate,
        subjectId: existingAssignment.subjectId,
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
      select: { id: true, classId: true },
    });

    const selectedLessonsByClass = new Map<
      number,
      { id: number; classId: number }
    >();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of groupAssignments) {
        if (
          assignment.classId &&
          !selectedLessonsByClass.has(assignment.classId)
        ) {
          await tx.assignment.delete({ where: { id: assignment.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassAssignment = groupAssignments.find(
          (assignment) => assignment.classId === classId,
        );

        if (existingClassAssignment) {
          await tx.assignment.update({
            where: { id: existingClassAssignment.id },
            data: {
              title: data.title,
              startDate: data.startDate,
              endDate: data.endDate,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        } else {
          await tx.assignment.create({
            data: {
              title: data.title,
              startDate: data.startDate,
              endDate: data.endDate,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        }
      }
    });

    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) {
    return { success: false, error: true, message: "Invalid assignment id." };
  }

  const role = await getCurrentRole();
  const userId = await getUserId();
  try {
    if (role === "teacher") {
      const teacherAssignment = await prisma.assignment.findFirst({
        where: { id, lesson: { teacherId: userId! } },
        select: { id: true },
      });

      if (!teacherAssignment) {
        return {
          success: false,
          error: true,
          message: "You are not allowed to delete this assignment.",
        };
      }
    }

    await prisma.assignment.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

const canTeacherManageResultAssessment = async ({
  role,
  userId,
  assessmentType,
  assessmentId,
}: {
  role: Awaited<ReturnType<typeof getCurrentRole>>;
  userId: string | null;
  assessmentType: "exam" | "assignment";
  assessmentId: number;
}) => {
  if (role === "admin") return true;
  if (role !== "teacher" || !userId) return false;

  if (assessmentType === "exam") {
    const exam = await prisma.exam.findFirst({
      where: { id: assessmentId, lesson: { teacherId: userId } },
      select: { id: true },
    });
    return Boolean(exam);
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assessmentId, lesson: { teacherId: userId } },
    select: { id: true },
  });
  return Boolean(assignment);
};
/////////////////////////////////////////////////////////////////
export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const isAllowed = await canTeacherManageResultAssessment({
      role,
      userId,
      assessmentType: data.assessmentType,
      assessmentId: data.assessmentId,
    });

    if (!isAllowed) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to create results for this assessment.",
      };
    }

    await prisma.result.create({
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
      },
    });

    return successResult(["/list/results"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Result id is required." };
  }

  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id: data.id },
      include: {
        exam: { select: { lesson: { select: { teacherId: true } } } },
        assignment: { select: { lesson: { select: { teacherId: true } } } },
      },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "The result you are trying to update was not found.",
      };
    }

    if (
      role === "teacher" &&
      existingResult.exam?.lesson.teacherId !== userId &&
      existingResult.assignment?.lesson.teacherId !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to update this result.",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: true,
        message: "You are not allowed to update results.",
      };
    }

    const isAllowed = await canTeacherManageResultAssessment({
      role,
      userId,
      assessmentType: data.assessmentType,
      assessmentId: data.assessmentId,
    });

    if (!isAllowed) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to assign this assessment.",
      };
    }

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
      },
    });

    return successResult(["/list/results"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid result id." };

  const role = await getCurrentRole();
  const userId = await getUserId();

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id },
      include: {
        exam: { select: { lesson: { select: { teacherId: true } } } },
        assignment: { select: { lesson: { select: { teacherId: true } } } },
      },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "The result you are trying to delete was not found.",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: true,
        message: "You are not allowed to delete results.",
      };
    }

    if (
      role === "teacher" &&
      existingResult.exam?.lesson.teacherId !== userId &&
      existingResult.assignment?.lesson.teacherId !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to delete this result.",
      };
    }

    await prisma.result.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
/////////////////////////////////////////////////////////////
export const saveDailyAttendance = async (
  prevState: any,
  formData: FormData,
) => {
  const role = await getCurrentRole();
  const userId = await getUserId();

  if (role !== "admin" && role !== "teacher") {
    return {
      success: false,
      error: true,
      message: "You are not allowed to manage attendance.",
    };
  }

  const date = new Date(formData.get("date") as string);

  const raw = formData.get("changes");

  if (!raw || typeof raw !== "string") {
    return {
      success: false,
      error: true,
      message: "No changes detected.",
    };
  }

  const changes = JSON.parse(raw) as Record<string, boolean>;

  const records = Object.entries(changes).map(([id, present]) => ({
    id,
    present,
  }));

  if (records.length === 0) {
    return {
      success: false,
      error: true,
      message: "No changes to save.",
    };
  }

  // ❗ safety
  if (records.length === 0) {
    return {
      success: false,
      error: true,
      message: "No attendance data submitted.",
    };
  }

  try {
    // =========================
    // STUDENT ATTENDANCE
    // =========================
    await prisma.$transaction(
      records.map((record) =>
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: record.id,
              date,
            },
          },
          update: {
            present: record.present,
          },
          create: {
            studentId: record.id,
            date,
            present: record.present,
          },
        }),
      ),
    );

    return {
      success: true,
      error: false,
      message: "Attendance saved successfully",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: true,
      message: "Something went wrong while saving attendance.",
    };
  }
};
///////////////////////////////////////////////////////
export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Event id is required." };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        classes: {
          set: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid event id." };

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.event.delete({ where: { id } });
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
///////////////////////////////////////////////////////////
export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/announcements"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Announcement id is required.",
    };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          set: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/announcements"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) {
    return { success: false, error: true, message: "Invalid announcement id." };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.announcement.delete({ where: { id } });
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
///////////////////////////////////////////////////////////

export const createMessage = async (
  currentState: CurrentState,
  data: MessageSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.message.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          connect: (data.classIds ?? []).map((classId) => ({ id: classId })),
        },
        students: {
          connect: (data.studentIds ?? []).map((studentId) => ({
            id: studentId,
          })),
        },
        parents: {
          connect: (data.parentIds ?? []).map((parentId) => ({
            id: parentId,
          })),
        },
        teachers: {
          connect: (data.teacherIds ?? []).map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/messages"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateMessage = async (
  currentState: CurrentState,
  data: MessageSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Message id is required.",
    };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.message.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          set: (data.classIds ?? []).map((classId) => ({ id: classId })),
        },
        students: {
          set: (data.studentIds ?? []).map((studentId) => ({ id: studentId })),
        },
        parents: {
          set: (data.parentIds ?? []).map((parentId) => ({ id: parentId })),
        },
        teachers: {
          set: (data.teacherIds ?? []).map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return successResult(["/list/messages"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteMessage = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid message id." };

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.message.delete({ where: { id } });
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
