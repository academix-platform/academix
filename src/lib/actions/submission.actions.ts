"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";

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
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "submissions",
    resource_type: isImage ? "image" : "raw",
    use_filename: true,
    unique_filename: true,
  });

  return { url: result.secure_url, fileType: ext, fileName: file.name };
}

// ─── تسليم الطالب (إنشاء أو إعادة تسليم) ────────────────────────────────────
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
      return { success: false, error: true, message: "Assignment ID is required" };
    }

    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });
    if (!student) {
      return { success: false, error: true, message: "Student not found" };
    }

    // التحقق أن الواجب يخص صف الطالب
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: student.schoolId,
        class: { students: { some: { id: userId } } },
      },
      select: { id: true },
    });
    if (!assignment) {
      return { success: false, error: true, message: "Assignment not found" };
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

    const note = (formData.get("note") as string) || null;
    const { url, fileType, fileName } = await uploadToCloudinary(file);

    // upsert — إنشاء أو تحديث إذا سبق التسليم
    await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: userId },
      },
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
    return { success: true, error: false, message: "Submitted successfully!" };
  } catch (err) {
    console.error("[submitAssignment]", err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}