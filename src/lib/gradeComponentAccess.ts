import type { Prisma } from "@prisma/client";

type GradeComponentDb = Pick<Prisma.TransactionClient, "gradeSchemeComponent">;

export type GradeComponentAssessmentScope = {
  schoolId: number;
  teacherId: string | null;
  classId: number;
  subjectId: number;
  academicYearId: number;
  semester: "FIRST" | "SECOND";
  componentId: number;
};

export const findGradeSchemeComponent = async (
  db: GradeComponentDb,
  scope: GradeComponentAssessmentScope,
) => {
  if (!scope.teacherId) return null;

  return db.gradeSchemeComponent.findFirst({
    where: {
      componentId: scope.componentId,
      scheme: {
        schoolId: scope.schoolId,
        teacherId: scope.teacherId,
        classId: scope.classId,
        subjectId: scope.subjectId,
        academicYearId: scope.academicYearId,
        semester: scope.semester,
      },
    },
    select: { id: true },
  });
};
