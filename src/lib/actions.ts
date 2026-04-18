"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ParentSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";

type CurrentState = { success: boolean; error: boolean; message?: string };

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

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
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

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: { id: parseInt(id) },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
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

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    await prisma.class.update({
      where: { id: data.id },
      data,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({
      where: { id: parseInt(id) },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

////////////////////////////////////////////////////
export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  try {
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
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

    return { success: true, error: false };
  } catch (err) {
    const message = getReadableActionErrorMessage(err);
    return { success: false, error: true, message };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  if (!data.id) return { success: false, error: true };
  try {
    const user = await (
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

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.teacher.delete({
      where: { id: id },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};
////////////////////////////////////////////////////
export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  try {
    const classItem = await prisma.class.findUnique({
      where: {
        id: data.classId,
      },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity == classItem._count.students)
      return { success: false, error: true };
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "student" },
    });

    await prisma.student.create({
      data: {
        id: user.id,
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

    return { success: true, error: false };
  } catch (err) {
    const message = getReadableActionErrorMessage(err);
    return { success: false, error: true, message };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema,
) => {
  if (!data.id) return { success: false, error: true };
  try {
    const user = await (
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

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.student.delete({
      where: { id: id },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};
////////////////////////////////////////////////////
export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  try {
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.create({
      data: {
        id: user.id,
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

    return { success: true, error: false };
  } catch (err) {
    const message = getReadableActionErrorMessage(err);
    return { success: false, error: true, message };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  if (!data.id) return { success: false, error: true };
  try {
    const user = await (
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
          connect: data.students?.map((studentId: string) => ({
            id: studentId,
          })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = data.get("id") as string;
  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.parent.delete({
      where: { id: id },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};
