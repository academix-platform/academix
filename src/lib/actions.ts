"use server";

import { revalidatePath } from "next/cache";
import {
  AnnouncementSchema,
  AssignmentSchema,
  ClassSchema,
  ExamSchema,
  EventSchema,
  MessageSchema,
  ParentSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
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

////////////////////////////////////////////////////

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
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
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
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
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
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
    await (await clerkClient()).users.deleteUser(id);

    await prisma.teacher.delete({
      where: { id: id },
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
