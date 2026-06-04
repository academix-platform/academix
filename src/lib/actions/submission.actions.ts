// src/lib/actions/submission.actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { notifyAssignmentSubmitted, notifyAssignmentFeedback } from "./notification.actions";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export type SubmissionState = {
  success: boolean;
  error: boolean;
  message: string;
};

async function uploadToCloudinary(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "submissions",
    resource_type: "auto",
    use_filename: true,
    unique_filename: true,
  });
  return { url: result.secure_url, fileType: result.format, fileName: file.name, publicId: result.public_id };
}

async function deleteFromCloudinary(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete old file:", error);
  }
}

function extractPublicIdFromUrl(url: string): string | null {
  const parts = url.split('/');
  const uploadIndex = parts.findIndex(p => p === 'upload');
  if (uploadIndex === -1 || uploadIndex + 2 >= parts.length) return null;
  const publicIdParts = parts.slice(uploadIndex + 2);
  const publicId = publicIdParts.join('/').split('.')[0];
  return publicId;
}

export async function submitAssignment(
  _state: SubmissionState,
  formData: FormData
): Promise<SubmissionState> {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (!userId || role !== "student") {
      return { success: false, error: true, message: "Unauthorized" };
    }

    const assignmentId = Number(formData.get("assignmentId"));
    if (!assignmentId) {
      return { success: false, error: true, message: "Assignment ID required" };
    }

    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });
    if (!student) {
      return { success: false, error: true, message: "Student not found" };
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: student.schoolId,
        class: { students: { some: { id: userId } } },
      },
      select: { id: true, endDate: true, allowLateSubmission: true },
    });
    if (!assignment) {
      return { success: false, error: true, message: "Assignment not found" };
    }

    const now = new Date();
    if (now > new Date(assignment.endDate) && !assignment.allowLateSubmission) {
      return { success: false, error: true, message: "Deadline passed. Submission is not allowed." };
    }

    const academicYear = await getCurrentAcademicYearOrNull(student.schoolId);
    if (!academicYear) {
      return { success: false, error: true, message: "No current academic year" };
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: true, message: "File is required" };
    }
    if (file.size > 20 * 1024 * 1024) {
      return { success: false, error: true, message: "File must be under 20MB" };
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: userId } },
      select: { fileUrl: true },
    });

    // رفع الملف الجديد
    const { url, fileType, fileName, publicId: newPublicId } = await uploadToCloudinary(file);

    // حذف الملف القديم إذا وجد
    if (existing?.fileUrl) {
      const oldPublicId = extractPublicIdFromUrl(existing.fileUrl);
      if (oldPublicId) await deleteFromCloudinary(oldPublicId);
    }

    const note = formData.get("note") as string | null;

    // حفظ أو تحديث التسليم
    await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: userId } },
      create: {
        fileUrl: url,
        fileName,
        fileType,
        note,
        assignmentId,
        studentId: userId,
        schoolId: student.schoolId,
        academicYearId: academicYear.id,
      },
      update: {
        fileUrl: url,
        fileName,
        fileType,
        note,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/list/assignments");

    // ✅ إشعار المعلم بالتسليم (فقط عند أول تسليم)
    if (!existing) {
      try {
        const assignmentWithLesson = await prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: {
            title: true,
            lesson: { select: { teacherId: true } },
          },
        });
        const studentData = await prisma.student.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        if (assignmentWithLesson && studentData) {
          await notifyAssignmentSubmitted({
            schoolId: student.schoolId,
            assignmentId,
            assignmentTitle: assignmentWithLesson.title,
            studentName: studentData.name,
            teacherId: assignmentWithLesson.lesson.teacherId,
          });
        }
      } catch {}
    }

    const isUpdate = !!existing;
    const successMessage = isUpdate
      ? "File replaced successfully!"
      : "Assignment submitted successfully!";

    return { success: true, error: false, message: successMessage };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

export async function updateTeacherFeedback(
  submissionId: number,
  teacherFeedback: string
): Promise<SubmissionState> {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || !["teacher", "admin"].includes(role ?? "")) {
      return { success: false, error: true, message: "Unauthorized" };
    }

    const submission = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { teacherFeedback },
      select: {
        studentId: true,
        schoolId: true,
        assignment: {
          select: {
            title: true,
            lesson: { select: { teacher: { select: { name: true } } } },
          },
        },
      },
    });

    // ✅ إشعار الطالب بالفيدباك
    try {
      await notifyAssignmentFeedback({
        schoolId: submission.schoolId,
        studentId: submission.studentId,
        assignmentTitle: submission.assignment.title,
        teacherName: submission.assignment.lesson.teacher.name,
      });
    } catch {}

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Feedback saved successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}