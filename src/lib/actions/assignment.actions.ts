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

function extractAssignmentData(formData: FormData): {
  id?: number;
  title: string;
  startDate: Date;
  endDate: Date;
  subjectId: number;
  classIds: number[];
  file: File | null;
  removeFile: boolean;
  allowLateSubmission: boolean; // ✅ حقل جديد
} {
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : undefined;
  const title = formData.get("title") as string;
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;
  const subjectId = Number(formData.get("subjectId"));
  const classIdsRaw = formData.getAll("classIds");
  const classIds = classIdsRaw.map(c => Number(c)).filter(id => !isNaN(id));
  const file = formData.get("file") as File | null;
  const removeFile = formData.get("removeFile") === "true";
  // ✅ boolean يُرسَل كـ string "true"/"false" من FormData
  const allowLateSubmission = formData.get("allowLateSubmission") === "true";

  return {
    id,
    title,
    startDate: new Date(startDateRaw),
    endDate: new Date(endDateRaw),
    subjectId,
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

  const { title, startDate, endDate, subjectId, classIds, file, removeFile, allowLateSubmission } =
    extractAssignmentData(formData);

  const validation = assignmentSchema.safeParse({
    title,
    startDate,
    endDate,
    subjectId,
    classIds,
    allowLateSubmission,
  });
  if (!validation.success) {
    return { success: false, error: true, message: validation.error.errors[0].message };
  }

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const lessons = await prisma.lesson.findMany({
      where: {
        academicYearId,
        schoolId: access.schoolId,
        subjectId,
        classId: { in: classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }
    if (lessons.length !== classIds.length) {
      return {
        success: false,
        error: true,
        message: "One or more selected classes do not have a lesson for that subject.",
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

    await prisma.$transaction(
      lessons.map((lesson) =>
        prisma.assignment.create({
          data: {
            title,
            startDate,
            endDate,
            lessonId: lesson.id,
            classId: lesson.classId,
            subjectId,
            academicYearId,
            schoolId: access.schoolId,
            fileUrl,
            fileName,
            allowLateSubmission, // ✅ حفظ الخيار
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
  formData: FormData,
) => {
  const { id, title, startDate, endDate, subjectId, classIds, file, removeFile, allowLateSubmission } =
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
    startDate,
    endDate,
    subjectId,
    classIds,
    allowLateSubmission,
  });
  if (!validation.success) {
    return { success: false, error: true, message: validation.error.errors[0].message };
  }

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const existingAssignment = await prisma.assignment.findUnique({
      where: { id, schoolId: access.schoolId },
      select: { fileUrl: true, fileName: true, title: true, startDate: true, endDate: true, subjectId: true },
    });
    if (!existingAssignment) {
      return { success: false, error: true, message: "Assignment not found." };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        academicYearId,
        subjectId,
        classId: { in: classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }
    if (lessons.length !== classIds.length) {
      return {
        success: false,
        error: true,
        message: "One or more selected classes do not have a lesson for that subject.",
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
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
      select: { id: true, classId: true },
    });

    const selectedLessonsByClass = new Map<number, { id: number; classId: number }>();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of groupAssignments) {
        if (assignment.classId && !selectedLessonsByClass.has(assignment.classId)) {
          await tx.assignment.delete({ where: { id: assignment.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassAssignment = groupAssignments.find((a) => a.classId === classId);
        const data = {
          title,
          startDate,
          endDate,
          lessonId: lesson.id,
          classId,
          subjectId,
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
        where: { id, schoolId: access.schoolId, lesson: { teacherId: userId } },
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