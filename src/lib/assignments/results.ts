import "server-only";
import { Prisma } from "@prisma/client";

/**
 * Removes the published Result rows behind these submissions. A Result row
 * is what students, parents and final averages read as the published grade,
 * so it goes whenever the grade is unpublished; publishing recreates it.
 * Not a server action: callers authorise first.
 */
export const deleteAssignmentResultsForSubmissions = async (
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
