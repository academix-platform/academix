import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { getCurrentRole, getUserId } from "@/lib/auth";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  if (type !== "delete") {
    switch (table) {
      case "subject":
        const teachers = await prisma.teacher.findMany({
          select: { id: true, name: true },
        });
        relatedData = { teachers };
        break;
      case "class":
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true },
        });
        relatedData = { grades: classGrades, teachers: classTeachers };
        break;
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        const studentParents = await prisma.parent.findMany({
          select: { id: true, name: true },
        });
        relatedData = {
          classes: studentClasses,
          grades: studentGrades,
          parents: studentParents,
        };
        break;
      case "parent":
        const parentStudents = await prisma.student.findMany({
          select: { id: true, name: true },
        });
        relatedData = { students: parentStudents };
        break;
      case "exam":
        const role = await getCurrentRole();
        const userId = await getUserId();
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: userId! } : {}),
          },
          select: {
            id: true,
            subjectId: true,
            classId: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        });

        const subjectsMap = new Map<number, { id: number; name: string }>();
        const classesMap = new Map<number, { id: number; name: string }>();

        for (const lesson of examLessons) {
          subjectsMap.set(lesson.subject.id, lesson.subject);
          classesMap.set(lesson.class.id, lesson.class);
        }

        relatedData = {
          subjects: Array.from(subjectsMap.values()),
          classes: Array.from(classesMap.values()),
          lessons: examLessons.map((lesson) => ({
            id: lesson.id,
            subjectId: lesson.subjectId,
            classId: lesson.classId,
          })),
        };
        break;
    }
  }
  return (
    <div>
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
