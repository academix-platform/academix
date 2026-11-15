import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { AuthUser } from "./auth";

type Viewer = Pick<AuthUser, "userId" | "role" | "schoolId">;

export type StoredFileType = "assignment" | "studyMaterial" | "submission";

export type StoredFile = {
  fileUrl: string;
  fileName: string | null;
  /** Used for the download name when the original file name is missing. */
  fallbackName: string;
};

// Who may open which file. Everything is limited to the viewer's school; a
// record the viewer may not open is reported as missing, not as forbidden.

const studentInClass = (where: Prisma.StudentWhereInput): Prisma.AssignmentWhereInput => ({
  OR: [
    { class: { students: { some: where } } },
    { lesson: { class: { students: { some: where } } } },
  ],
});

const assignmentScope = (viewer: Viewer): Prisma.AssignmentWhereInput | null => {
  switch (viewer.role) {
    case "admin":
      return {};
    case "teacher":
      return {
        OR: [
          { teacherId: viewer.userId },
          { lesson: { teacherId: viewer.userId } },
          { class: { lessons: { some: { teacherId: viewer.userId } } } },
        ],
      };
    case "student":
      return studentInClass({ id: viewer.userId });
    case "parent":
      return studentInClass({ parentId: viewer.userId });
    default:
      return null;
  }
};

const studyMaterialScope = (viewer: Viewer): Prisma.StudyMaterialWhereInput | null => {
  switch (viewer.role) {
    case "admin":
    case "teacher":
      return {};
    case "student":
      return { subject: { grade: { students: { some: { id: viewer.userId } } } } };
    case "parent":
      return { subject: { grade: { students: { some: { parentId: viewer.userId } } } } };
    default:
      return null;
  }
};

const submissionScope = (viewer: Viewer): Prisma.AssignmentSubmissionWhereInput | null => {
  switch (viewer.role) {
    case "admin":
      return {};
    case "teacher":
      return {
        assignment: {
          OR: [{ teacherId: viewer.userId }, { lesson: { teacherId: viewer.userId } }],
        },
      };
    case "student":
      return { studentId: viewer.userId };
    case "parent":
      return { student: { parentId: viewer.userId } };
    default:
      return null;
  }
};

/** The stored file behind a download/preview link, if the viewer may open it. */
export const findAccessibleFile = async (
  type: StoredFileType,
  id: number,
  viewer: Viewer,
): Promise<StoredFile | null> => {
  if (type === "assignment") {
    const scope = assignmentScope(viewer);
    if (!scope) return null;
    const assignment = await prisma.assignment.findFirst({
      where: { id, schoolId: viewer.schoolId, ...scope },
      select: { fileUrl: true, fileName: true, title: true },
    });
    if (!assignment?.fileUrl) return null;
    return {
      fileUrl: assignment.fileUrl,
      fileName: assignment.fileName,
      fallbackName: assignment.title || "assignment",
    };
  }

  if (type === "studyMaterial") {
    const scope = studyMaterialScope(viewer);
    if (!scope) return null;
    const material = await prisma.studyMaterial.findFirst({
      where: { id, schoolId: viewer.schoolId, ...scope },
      select: { fileUrl: true, fileName: true, title: true },
    });
    if (!material?.fileUrl) return null;
    return {
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fallbackName: material.title || "study-material",
    };
  }

  const scope = submissionScope(viewer);
  if (!scope) return null;
  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id, schoolId: viewer.schoolId, ...scope },
    select: {
      fileUrl: true,
      fileName: true,
      student: { select: { name: true } },
      assignment: { select: { title: true } },
    },
  });
  if (!submission?.fileUrl) return null;
  return {
    fileUrl: submission.fileUrl,
    fileName: submission.fileName,
    fallbackName: `${submission.student?.name || "student"}_${submission.assignment?.title || "submission"}`,
  };
};
