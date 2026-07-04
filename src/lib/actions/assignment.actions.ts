// src/lib/actions/assignment.actions.ts
"use server";

import { assignmentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  getRequiredAcademicYearId,
  parseNumericId,
  requireActionAccess,
  successResult,
} from "./helpers";
import cloudinary from "@/lib/cloudinary";
import { notifyNewAssignment, notifyAssignmentUpdated } from "./notification.actions";

async function uploadAssignmentFile(file: File, folder = "assignments"): Promise<{ url: string; name: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto", filename_override: file.name },
      (error, result) => {
        if (error || !result) reject(error || new Error("Upload failed"));
        else resolve({ url: result.secure_url, name: file.name });
      }
    );
    uploadStream.end(buffer);
  });
}

async function deleteAssignmentFile(fileUrl: string) {
  if (!fileUrl.includes("cloudinary")) return;
  try {
    const parts = fileUrl.split('/');
    const publicIdWithExt = parts.slice(7).join('/');
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete file from Cloudinary:", error);
  }
}

type AssignmentAccess = {
  userId: string;
  role: string;
  schoolId: number;
};

const assignmentTeacherAccessWhere = (teacherId: string) => ({
  OR: [{ teacherId }, { lesson: { teacherId } }],
});

const getAssignmentClassAssignments = async (
  access: AssignmentAccess,
  academicYearId: number,
  subjectId: number,
  classIds: number[],
) => {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId: access.schoolId },
    select: {
      id: true,
      gradeId: true,
      teachers: { select: { id: true } },
    },
  });

  if (!subject) {
    return {
      error: true as const,
      message: "Selected subject was not found.",
    };
  }

  const classes = await prisma.class.findMany({
    where: { id: { in: classIds }, schoolId: access.schoolId },
    select: {
      id: true,
      gradeId: true,
      teachers: { select: { id: true } },
    },
  });

  if (classes.length !== classIds.length) {
    return {
      error: true as const,
      message: "One or more selected classes were not found.",
    };
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      academicYearId,
      schoolId: access.schoolId,
      subjectId,
      classId: { in: classIds },
      ...(access.role === "teacher" ? { teacherId: access.userId } : {}),
    },
    select: { id: true, classId: true, teacherId: true },
  });

  const lessonsByClass = new Map<number, (typeof lessons)[number]>();
  for (const lesson of lessons) {
    if (!lessonsByClass.has(lesson.classId)) {
      lessonsByClass.set(lesson.classId, lesson);
    }
  }

  const subjectTeacherIds = new Set(
    subject.teachers.map((teacher) => teacher.id),
  );
  const assignments = [];

  for (const selectedClass of classes) {
    const lesson = lessonsByClass.get(selectedClass.id);
    const classTeacherIds = new Set(
      selectedClass.teachers.map((teacher) => teacher.id),
    );
    const sharedTeacherId =
      [...subjectTeacherIds].find((teacherId) =>
        classTeacherIds.has(teacherId),
      ) ??
      lesson?.teacherId ??
      null;

    if (!lesson && selectedClass.gradeId !== subject.gradeId) {
      return {
        error: true as const,
        message: "One or more classes do not match the selected subject grade.",
      };
    }

    if (access.role === "teacher") {
      const teacherHasSubjectGrade =
        subjectTeacherIds.has(access.userId) &&
        selectedClass.gradeId === subject.gradeId;
      const teacherHasClassSubject =
        subjectTeacherIds.has(access.userId) &&
        classTeacherIds.has(access.userId);
      const teacherHasLesson = lesson?.teacherId === access.userId;

      if (!teacherHasSubjectGrade && !teacherHasClassSubject && !teacherHasLesson) {
        return {
          error: true as const,
          message:
            "You are not assigned to teach this subject for one or more selected classes.",
        };
      }
    }

    assignments.push({
      classId: selectedClass.id,
      lessonId: lesson?.id ?? null,
      teacherId: access.role === "teacher" ? access.userId : sharedTeacherId,
    });
  }

  return { error: false as const, assignments };
};

function extractAssignmentData(formData: FormData): {
  id?: number;
  title: string;
  rubric: string | null;
  startDate: Date;
  endDate: Date;
  subjectId: number;
  teacherId: string | null;
  maxScore: number;
  classIds: number[];
  file: File | null;
  removeFile: boolean;
  allowLateSubmission: boolean; // ✅ حقل جديد
} {
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : undefined;
  const title = formData.get("title") as string;
  const rubricRaw = formData.get("rubric");
  const rubric =
    typeof rubricRaw === "string" && rubricRaw.trim() ? rubricRaw.trim() : null;
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;
  const subjectId = Number(formData.get("subjectId"));
  const teacherIdRaw = formData.get("teacherId");
  const teacherId =
    typeof teacherIdRaw === "string" && teacherIdRaw.trim()
      ? teacherIdRaw.trim()
      : null;
  const maxScoreRaw = Number(formData.get("maxScore") ?? 10);
  const classIdsRaw = formData.getAll("classIds");
  const classIds = classIdsRaw.map(c => Number(c)).filter(id => !isNaN(id));
  const file = formData.get("file") as File | null;
  const removeFile = formData.get("removeFile") === "true";
  // ✅ boolean يُرسَل كـ string "true"/"false" من FormData
  const allowLateSubmission = formData.get("allowLateSubmission") === "true";

  return {
    id,
    title,
    rubric,
    startDate: new Date(startDateRaw),
    endDate: new Date(endDateRaw),
    subjectId,
    teacherId,
    maxScore: Number.isFinite(maxScoreRaw) && maxScoreRaw > 0 ? maxScoreRaw : 10,
    classIds,
    file,
    removeFile,
    allowLateSubmission,
  };
}

export const createAssignment = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  const { title, rubric, startDate, endDate, subjectId, teacherId, maxScore, classIds, file, removeFile, allowLateSubmission } =
    extractAssignmentData(formData);

  const validation = assignmentSchema.safeParse({
    title,
    rubric,
    startDate,
    endDate,
    maxScore,
    subjectId,
    teacherId,
    classIds,
    allowLateSubmission,
  });
  if (!validation.success) {
    return { success: false, error: true, message: validation.error.errors[0].message };
  }

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);
    const selectedTeacherId =
      access.role === "admin" && teacherId ? teacherId : null;

    if (selectedTeacherId) {
      const teacherExists = await prisma.teacher.count({
        where: { id: selectedTeacherId, schoolId: access.schoolId },
      });

      if (!teacherExists) {
        return {
          success: false,
          error: true,
          message: "Selected teacher was not found.",
        };
      }
    }

    const assignmentResult = await getAssignmentClassAssignments(
      access,
      academicYearId,
      subjectId,
      classIds,
    );

    if (assignmentResult.error) {
      return {
        success: false,
        error: true,
        message: assignmentResult.message,
      };
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (file && file.size > 0 && !removeFile) {
      try {
        const upload = await uploadAssignmentFile(file);
        fileUrl = upload.url;
        fileName = upload.name;
      } catch (err) {
        console.error("❌ Upload failed:", err);
        return { success: false, error: true, message: "File upload failed." };
      }
    }

    const createdAssignments = await prisma.$transaction(
      assignmentResult.assignments.map((assignment) =>
        prisma.assignment.create({
          data: {
            title,
            rubric,
            startDate,
            endDate,
            lessonId: assignment.lessonId,
            teacherId: selectedTeacherId ?? assignment.teacherId,
            classId: assignment.classId,
            subjectId,
            maxScore,
            academicYearId,
            schoolId: access.schoolId,
            fileUrl,
            fileName,
            allowLateSubmission, // ✅ حفظ الخيار
          },
        }),
      ),
    );

    // ✅ إشعار الطلاب بالواجب الجديد
    for (const assignment of createdAssignments) {
      if (assignment.classId) {
        await notifyNewAssignment({
          schoolId: access.schoolId,
          assignmentId: assignment.id,
          assignmentTitle: title,
          classId: assignment.classId,
        }).catch(() => {}); // لا نوقف العملية إذا فشل الإشعار
      }
    }

    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  const { id, title, rubric, startDate, endDate, subjectId, teacherId, maxScore, classIds, file, removeFile, allowLateSubmission } =
    extractAssignmentData(formData);

  if (!id) {
    return { success: false, error: true, message: "Assignment id is required." };
  }

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  const validation = assignmentSchema.safeParse({
    title,
    rubric,
    startDate,
    endDate,
    maxScore,
    subjectId,
    teacherId,
    classIds,
    allowLateSubmission,
  });
  if (!validation.success) {
    return { success: false, error: true, message: validation.error.errors[0].message };
  }

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);
    const selectedTeacherId =
      access.role === "admin" && teacherId ? teacherId : null;

    if (selectedTeacherId) {
      const teacherExists = await prisma.teacher.count({
        where: { id: selectedTeacherId, schoolId: access.schoolId },
      });

      if (!teacherExists) {
        return {
          success: false,
          error: true,
          message: "Selected teacher was not found.",
        };
      }
    }

    const existingAssignment = await prisma.assignment.findUnique({
      where: { id, schoolId: access.schoolId },
      select: { fileUrl: true, fileName: true, title: true, startDate: true, endDate: true, subjectId: true },
    });
    if (!existingAssignment) {
      return { success: false, error: true, message: "Assignment not found." };
    }

    const assignmentResult = await getAssignmentClassAssignments(
      access,
      academicYearId,
      subjectId,
      classIds,
    );

    if (assignmentResult.error) {
      return {
        success: false,
        error: true,
        message: assignmentResult.message,
      };
    }

    let fileUrl = existingAssignment.fileUrl;
    let fileName = existingAssignment.fileName;

    if (removeFile && existingAssignment.fileUrl) {
      await deleteAssignmentFile(existingAssignment.fileUrl);
      fileUrl = null;
      fileName = null;
    }

    if (file && file.size > 0) {
      if (existingAssignment.fileUrl && !removeFile) {
        await deleteAssignmentFile(existingAssignment.fileUrl);
      }
      const upload = await uploadAssignmentFile(file);
      fileUrl = upload.url;
      fileName = upload.name;
    }

    const groupAssignments = await prisma.assignment.findMany({
      where: {
        title: existingAssignment.title,
        startDate: existingAssignment.startDate,
        endDate: existingAssignment.endDate,
        academicYearId,
        schoolId: access.schoolId,
        subjectId: existingAssignment.subjectId,
        ...(role === "teacher" ? assignmentTeacherAccessWhere(userId!) : {}),
      },
      select: { id: true, classId: true, teacherId: true },
    });

    const selectedAssignmentsByClass = new Map<
      number,
      (typeof assignmentResult.assignments)[number]
    >();
    for (const assignment of assignmentResult.assignments) {
      selectedAssignmentsByClass.set(assignment.classId, assignment);
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of groupAssignments) {
        if (assignment.classId && !selectedAssignmentsByClass.has(assignment.classId)) {
          await tx.assignment.delete({ where: { id: assignment.id } });
        }
      }

      for (const [classId, assignment] of selectedAssignmentsByClass) {
        const existingClassAssignment = groupAssignments.find((a) => a.classId === classId);
        const teacherId =
          selectedTeacherId ??
          existingClassAssignment?.teacherId ??
          assignment.teacherId ??
          null;
        const data = {
          title,
          rubric,
          startDate,
          endDate,
          lessonId: assignment.lessonId,
          teacherId,
          classId,
          subjectId,
          maxScore,
          academicYearId,
          schoolId: access.schoolId,
          fileUrl,
          fileName,
          allowLateSubmission, // ✅ حفظ الخيار عند التحديث
        };
        if (existingClassAssignment) {
          await tx.assignment.update({ where: { id: existingClassAssignment.id }, data });
        } else {
          await tx.assignment.create({ data });
        }
      }
    });

    // ✅ إشعار الطلاب بتحديث الواجب
    for (const [classId] of selectedAssignmentsByClass) {
      await notifyAssignmentUpdated({
        schoolId: access.schoolId,
        assignmentTitle: title,
        classId,
      }).catch(() => {});
    }

    return successResult(["/list/assignments"]);
  } catch (err) {
    console.error("Update error:", err);
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

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  try {
    if (role === "teacher") {
      const teacherAssignment = await prisma.assignment.findFirst({
        where: {
          id,
          schoolId: access.schoolId,
          ...assignmentTeacherAccessWhere(userId),
        },
        select: { id: true, fileUrl: true },
      });
      if (!teacherAssignment) {
        return {
          success: false,
          error: true,
          message: "You are not allowed to delete this assignment.",
        };
      }
      if (teacherAssignment.fileUrl) {
        await deleteAssignmentFile(teacherAssignment.fileUrl);
      }
    } else {
      const assignment = await prisma.assignment.findUnique({
        where: { id, schoolId: access.schoolId },
        select: { fileUrl: true },
      });
      if (assignment?.fileUrl) {
        await deleteAssignmentFile(assignment.fileUrl);
      }
    }

    await prisma.assignment.deleteMany({ where: { id, schoolId: access.schoolId } });
    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};
