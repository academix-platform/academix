// src/lib/actions/submission.actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import {
  errorResult,
  requireActionAccess,
  successResult,
} from "@/lib/actions/helpers";
import {
  notifyAssignmentSubmitted,
  notifyAssignmentFeedback,
} from "./notification.actions";

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

type SubmissionManagerAccess = {
  userId: string;
  role: string;
  schoolId: number;
};

type AssignmentSubmissionBulkFilters = {
  classId?: number | null;
  search?: string | null;
};

const assignmentManagerWhere = (access: SubmissionManagerAccess) =>
  access.role === "teacher"
    ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
    : {};

const findManagedSubmission = async (
  submissionId: number,
  access: SubmissionManagerAccess,
) => {
  return prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      schoolId: access.schoolId,
      assignment: assignmentManagerWhere(access),
    },
    select: {
      id: true,
      assignmentId: true,
      schoolId: true,
      assignment: {
        select: {
          id: true,
          academicYearId: true,
          maxScore: true,
        },
      },
    },
  });
};

const getManagedAssignmentGroup = async (
  assignmentId: number,
  access: SubmissionManagerAccess,
) => {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      schoolId: access.schoolId,
      ...assignmentManagerWhere(access),
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      subjectId: true,
      academicYearId: true,
      maxScore: true,
    },
  });

  if (!assignment) return null;

  const groupAssignments = await prisma.assignment.findMany({
    where: {
      title: assignment.title,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      subjectId: assignment.subjectId,
      schoolId: access.schoolId,
      academicYearId: assignment.academicYearId,
      ...assignmentManagerWhere(access),
    },
    select: { id: true, classId: true },
  });

  return {
    assignment,
    groupAssignments,
    assignmentIds: groupAssignments.map((item) => item.id),
  };
};

const getBulkAssignmentSubmissions = async (
  assignmentId: number,
  access: SubmissionManagerAccess,
  filters: AssignmentSubmissionBulkFilters = {},
) => {
  const group = await getManagedAssignmentGroup(assignmentId, access);
  if (!group) return null;

  const search = filters.search?.trim();

  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: { in: group.assignmentIds },
      schoolId: access.schoolId,
      ...(filters.classId
        ? { assignment: { classId: filters.classId } }
        : {}),
      ...(search
        ? {
            student: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    select: {
      id: true,
      assignmentId: true,
      studentId: true,
      score: true,
      academicYearId: true,
    },
  });

  return { ...group, submissions };
};

const deleteAssignmentResultsForSubmissions = async (
  tx: Prisma.TransactionClient,
  schoolId: number,
  submissions: Array<{
    assignmentId: number;
    studentId: string;
    academicYearId: number;
  }>,
) => {
  if (submissions.length === 0) return;

  await tx.result.deleteMany({
    where: {
      schoolId,
      OR: submissions.map((submission) => ({
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        academicYearId: submission.academicYearId,
      })),
    },
  });
};

async function uploadToCloudinary(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;
  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "submissions",
    resource_type: "auto",
    use_filename: true,
    unique_filename: true,
  });
  return {
    url: result.secure_url,
    fileType: result.format || file.type || extension,
    fileName: file.name,
    publicId: result.public_id,
  };
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
        OR: [
          { class: { students: { some: { id: userId } } } },
          { lesson: { class: { students: { some: { id: userId } } } } },
        ],
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
    let uploadedFile: {
      url: string;
      fileType: string;
      fileName: string;
      publicId: string;
    };

    try {
      uploadedFile = await uploadToCloudinary(file);
    } catch (uploadError) {
      console.error("[submitAssignment] upload failed", uploadError);
      return {
        success: false,
        error: true,
        message: "File upload failed. Please try again.",
      };
    }

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
        fileUrl: uploadedFile.url,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        note,
        assignmentId,
        studentId: userId,
        schoolId: student.schoolId,
        academicYearId: academicYear.id,
      },
      update: {
        fileUrl: uploadedFile.url,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        note,
        score: null,
        gradePublished: false,
        gradedAt: null,
        gradedBy: null,
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
            teacherId: true,
            lesson: { select: { teacherId: true } },
          },
        });
        const studentData = await prisma.student.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const teacherId =
          assignmentWithLesson?.teacherId ??
          assignmentWithLesson?.lesson?.teacherId;

        if (assignmentWithLesson && studentData && teacherId) {
          await notifyAssignmentSubmitted({
            schoolId: student.schoolId,
            assignmentId,
            assignmentTitle: assignmentWithLesson.title,
            studentName: studentData.name,
            teacherId,
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
    const access = await requireActionAccess(["admin", "teacher"]);
    if ("error" in access) {
      return { success: false, error: true, message: access.message };
    }

    const managedSubmission = await findManagedSubmission(submissionId, access);
    if (!managedSubmission) {
      return { success: false, error: true, message: "Submission not found" };
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
            teacher: { select: { name: true } },
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
        teacherName:
          submission.assignment.teacher?.name ??
          submission.assignment.lesson?.teacher.name ??
          "Your teacher",
      });
    } catch {}

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Feedback saved successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

export async function gradeAssignmentSubmission(
  submissionId: number,
  score: number,
): Promise<SubmissionState> {
  try {
    const access = await requireActionAccess(["admin", "teacher"]);
    if ("error" in access) {
      return { success: false, error: true, message: access.message };
    }

    const submission = await findManagedSubmission(submissionId, access);
    if (!submission) {
      return { success: false, error: true, message: "Submission not found" };
    }

    const maxScore = submission.assignment.maxScore;

    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return {
        success: false,
        error: true,
        message: `Score must be between 0 and ${maxScore}`,
      };
    }

    await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        gradePublished: false,
        gradedAt: new Date(),
        gradedBy: access.userId,
      },
    });

    revalidatePath("/list/assignments");
    revalidatePath("/list/results");

    return { success: true, error: false, message: "Grade saved successfully!" };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

export async function publishAssignmentGrades(
  assignmentId: number,
): Promise<SubmissionState> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: access.schoolId,
        ...assignmentManagerWhere(access),
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        subjectId: true,
        academicYearId: true,
        maxScore: true,
      },
    });

    if (!assignment) {
      return { success: false, error: true, message: "Assignment not found" };
    }

    const groupAssignments = await prisma.assignment.findMany({
      where: {
        title: assignment.title,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        subjectId: assignment.subjectId,
        schoolId: access.schoolId,
        academicYearId: assignment.academicYearId,
        ...assignmentManagerWhere(access),
      },
      select: { id: true },
    });

    const assignmentIds = groupAssignments.map((item) => item.id);

    const gradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        schoolId: access.schoolId,
        score: { not: null },
      },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        score: true,
        academicYearId: true,
      },
    });

    if (gradedSubmissions.length === 0) {
      return {
        success: false,
        error: true,
        message: "No graded submissions to publish",
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const submission of gradedSubmissions) {
        if (submission.score === null) continue;

        const existingResult = await tx.result.findFirst({
          where: {
            schoolId: access.schoolId,
            assignmentId: submission.assignmentId,
            studentId: submission.studentId,
            academicYearId: submission.academicYearId,
          },
          select: { id: true },
        });

        const resultData = {
          score: Math.round(submission.score),
          schoolId: access.schoolId,
          studentId: submission.studentId,
          examId: null,
          assignmentId: submission.assignmentId,
          academicYearId: submission.academicYearId,
        };

        if (existingResult) {
          await tx.result.update({
            where: { id: existingResult.id },
            data: resultData,
          });
        } else {
          await tx.result.create({ data: resultData });
        }
      }

      await tx.assignmentSubmission.updateMany({
        where: {
          id: { in: gradedSubmissions.map((submission) => submission.id) },
          schoolId: access.schoolId,
        },
        data: { gradePublished: true },
      });
    });

    const result = successResult(["/list/assignments", "/list/results"]);
    return {
      ...result,
      message: "Grades published successfully!",
    };
  } catch (err) {
    return {
      ...errorResult(err),
      message: "Something went wrong",
    };
  }
}

export async function clearAssignmentSubmissionGrades(
  assignmentId: number,
  filters: AssignmentSubmissionBulkFilters = {},
): Promise<SubmissionState> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  try {
    const bulk = await getBulkAssignmentSubmissions(assignmentId, access, filters);
    if (!bulk) {
      return { success: false, error: true, message: "Assignment not found" };
    }

    const gradedSubmissions = bulk.submissions.filter(
      (submission) => submission.score !== null,
    );

    if (gradedSubmissions.length === 0) {
      return { success: false, error: true, message: "No grades to remove" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignmentSubmission.updateMany({
        where: {
          id: { in: gradedSubmissions.map((submission) => submission.id) },
          schoolId: access.schoolId,
        },
        data: {
          score: null,
          gradePublished: false,
          gradedAt: null,
          gradedBy: null,
        },
      });

      await deleteAssignmentResultsForSubmissions(
        tx,
        access.schoolId,
        gradedSubmissions,
      );
    });

    revalidatePath("/list/assignments");
    revalidatePath(`/list/assignments/${assignmentId}/submissions`);
    revalidatePath("/list/results");

    return {
      success: true,
      error: false,
      message: `Removed ${gradedSubmissions.length} grade${gradedSubmissions.length === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}

export async function adjustAssignmentSubmissionScores(
  assignmentId: number,
  amount: number,
  filters: AssignmentSubmissionBulkFilters = {},
): Promise<SubmissionState> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  try {
    const bulk = await getBulkAssignmentSubmissions(assignmentId, access, filters);
    if (!bulk) {
      return { success: false, error: true, message: "Assignment not found" };
    }

    const maxScore = bulk.assignment.maxScore;
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > maxScore) {
      return {
        success: false,
        error: true,
        message: `Adjustment must be between -${maxScore} and ${maxScore}, and cannot be 0`,
      };
    }

    if (bulk.submissions.length === 0) {
      return { success: false, error: true, message: "No submissions to adjust" };
    }

    await prisma.$transaction(async (tx) => {
      for (const submission of bulk.submissions) {
        const currentScore = submission.score ?? 0;
        const nextScore = Math.min(
          maxScore,
          Math.max(0, currentScore + amount),
        );

        await tx.assignmentSubmission.update({
          where: { id: submission.id },
          data: {
            score: nextScore,
            gradePublished: false,
            gradedAt: new Date(),
            gradedBy: access.userId,
          },
        });
      }

      await deleteAssignmentResultsForSubmissions(
        tx,
        access.schoolId,
        bulk.submissions,
      );
    });

    revalidatePath("/list/assignments");
    revalidatePath(`/list/assignments/${assignmentId}/submissions`);
    revalidatePath("/list/results");

    return {
      success: true,
      error: false,
      message: `Adjusted ${bulk.submissions.length} score${bulk.submissions.length === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: true, message: "Something went wrong" };
  }
}
