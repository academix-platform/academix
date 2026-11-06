import "server-only";
import prisma from "../prisma";

type ExamViewer = {
  userId: string;
  role: string;
  schoolId: number;
};

/** Teachers see an exam they own directly or through its lesson. */
export const teacherExamAccessWhere = (teacherId: string) => ({
  OR: [{ teacherId }, { lesson: { teacherId } }],
});

const viewerScope = (viewer: ExamViewer) => ({
  schoolId: viewer.schoolId,
  ...(viewer.role === "teacher" ? teacherExamAccessWhere(viewer.userId) : {}),
});

/** Matches the per-class copies of an exam that the viewer may see. */
export const examGroupWhere = (groupId: string, viewer: ExamViewer) => ({
  groupId,
  ...viewerScope(viewer),
});

/**
 * Whether the viewer may manage an exam: admins within their school,
 * teachers when they own any copy in the exam's group.
 */
export const canManageExamGroup = async (
  groupId: string,
  examSchoolId: number,
  viewer: ExamViewer,
) => {
  if (examSchoolId !== viewer.schoolId) return false;
  if (viewer.role === "admin") return true;
  if (viewer.role !== "teacher") return false;

  const owned = await prisma.exam.count({
    where: examGroupWhere(groupId, viewer),
  });
  return owned > 0;
};
