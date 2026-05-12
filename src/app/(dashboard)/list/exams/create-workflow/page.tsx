import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import ExamWorkflowForm from "@/components/forms/ExamWorkflowForm";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";

export default async function CreateExamWorkflowPage() {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams", ["admin", "teacher"]);

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);
  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const subjects = await prisma.subject.findMany({
    where: {
      schoolId,
      ...(role === "teacher" ? { teachers: { some: { id: userId } } } : {}),
    },
    select: { id: true, name: true },
  });

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      ...(role === "teacher" ? { teachers: { some: { id: userId } } } : {}),
    },
    select: { id: true, name: true },
  });

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Exam Workflow</h1>
      <ExamWorkflowForm subjects={subjects} classes={classes} />
    </div>
  );
}
