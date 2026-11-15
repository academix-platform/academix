import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { deleteCloudinaryAssetByUrl } from "../cloudinaryAssets";

type Viewer = {
  userId: string;
  role: string;
  schoolId: number;
};

/** Teachers manage an assignment they own directly or through its lesson. */
export const assignmentTeacherAccessWhere = (teacherId: string) => ({
  OR: [{ teacherId }, { lesson: { teacherId } }],
});

export const assignmentManagerWhere = (viewer: Viewer) =>
  viewer.role === "teacher" ? assignmentTeacherAccessWhere(viewer.userId) : {};

/** Select this to be able to look up an assignment's per-class copies. */
export const ASSIGNMENT_GROUP_SELECT = {
  groupId: true,
} satisfies Prisma.AssignmentSelect;

/** Matches the per-class copies of an assignment that the viewer manages. */
export const assignmentGroupWhere = (
  assignment: { groupId: string },
  viewer: Viewer,
): Prisma.AssignmentWhereInput => ({
  groupId: assignment.groupId,
  schoolId: viewer.schoolId,
  ...assignmentManagerWhere(viewer),
});

/**
 * Copies of an assignment share one attachment. Only delete it from storage
 * once no assignment points at it any more.
 */
export const deleteAssignmentFileIfUnused = async (fileUrl: string | null) => {
  if (!fileUrl) return;
  const stillUsed = await prisma.assignment.count({ where: { fileUrl } });
  if (stillUsed === 0) await deleteCloudinaryAssetByUrl(fileUrl);
};
