import type { AuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type AssignmentFileAccess = {
  schoolId: number;
  teacherId: string | null;
  classId: number | null;
  lesson: { teacherId: string; classId: number } | null;
};

export async function canAccessAssignmentFile(
  user: AuthUser,
  assignment: AssignmentFileAccess,
) {
  if (user.schoolId !== assignment.schoolId) return false;
  if (user.role === "admin") return true;

  if (user.role === "teacher") {
    return (
      assignment.teacherId === user.userId ||
      assignment.lesson?.teacherId === user.userId
    );
  }

  if (user.role !== "student") return false;

  const student = await prisma.student.findFirst({
    where: { id: user.userId, schoolId: user.schoolId },
    select: { classId: true },
  });

  return !!student && (
    assignment.classId === student.classId ||
    assignment.lesson?.classId === student.classId
  );
}

type SubmissionFileAccess = {
  schoolId: number;
  studentId: string;
  assignment: AssignmentFileAccess;
};

export async function canAccessSubmissionFile(
  user: AuthUser,
  submission: SubmissionFileAccess,
) {
  if (
    user.schoolId !== submission.schoolId ||
    user.schoolId !== submission.assignment.schoolId
  ) {
    return false;
  }

  if (user.role === "admin") return true;
  if (user.role === "student") {
    return submission.studentId === user.userId;
  }

  return (
    user.role === "teacher" &&
    (submission.assignment.teacherId === user.userId ||
      submission.assignment.lesson?.teacherId === user.userId)
  );
}

type StudyMaterialFileAccess = {
  schoolId: number;
  teacherId: string;
  subject: { gradeId: number; teachers: { id: string }[] };
};

export async function canAccessStudyMaterialFile(
  user: AuthUser,
  material: StudyMaterialFileAccess,
) {
  if (user.schoolId !== material.schoolId) return false;
  if (user.role === "admin") return true;

  if (user.role === "teacher") {
    return (
      material.teacherId === user.userId ||
      material.subject.teachers.some((teacher) => teacher.id === user.userId)
    );
  }

  if (user.role !== "student") return false;

  const student = await prisma.student.findFirst({
    where: { id: user.userId, schoolId: user.schoolId },
    select: { gradeId: true },
  });

  return student?.gradeId === material.subject.gradeId;
}