import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { getAuthUser } from "@/lib/auth";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";

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
    | "announcement"
    | "message";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData: any = {};
  let modalData = data;

  if (type !== "delete") {
    const yearScopedTables: Array<FormContainerProps["table"]> = [
      "lesson",
      "exam",
      "assignment",
      "result",
    ];

    let academicYearId: number | undefined;
    if (yearScopedTables.includes(table)) {
      const currentAcademicYearId = await getCurrentAcademicYearIdOrNull();

      if (!currentAcademicYearId) {
        return (
          <div>
            <FormModal
              table={table}
              type={type}
              data={data}
              id={id}
              relatedData={{}}
            />
          </div>
        );
      }

      academicYearId = currentAcademicYearId;
    }

    switch (table) {
      case "subject":
        const teachers = await prisma.teacher.findMany({
          select: { id: true, name: true },
        });
        const grades = await prisma.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        });
        relatedData = { teachers, grades };
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
      case "lesson":
        const schoolSettings = await getSchoolScheduleSettings();
        const lessonClasses = await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        const lessonSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        const lessonTeachers = await prisma.teacher.findMany({
          select: {
            id: true,
            name: true,
            subjects: {
              select: { id: true },
            },
          },
          orderBy: { name: "asc" },
        });
        const classLessons = await prisma.lesson.findMany({
          where: { academicYearId: academicYearId! },
          select: {
            id: true,
            classId: true,
            day: true,
            name: true,
            startTime: true,
            subjectId: true,
            teacherId: true,
            teacher: { select: { name: true } },
          },
        });
        relatedData = {
          classes: lessonClasses,
          subjects: lessonSubjects,
          teachers: lessonTeachers,
          lessons: classLessons,
          schoolSettings,
        };
        break;
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
          orderBy: [{ name: "asc" }],
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
        const user = await getAuthUser();
        const role = user?.role;
        const userId = user?.userId;
        const examLessons = await prisma.lesson.findMany({
          where: {
            academicYearId: academicYearId!,
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
      case "assignment":
        const assignment = await getAuthUser();
        const assignmentRole = assignment?.role;
        const assignmentUserId = assignment?.userId;
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            academicYearId: academicYearId!,
            ...(assignmentRole === "teacher"
              ? { teacherId: assignmentUserId! }
              : {}),
          },
          select: {
            id: true,
            subjectId: true,
            classId: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        });

        const assignmentSubjectsMap = new Map<
          number,
          { id: number; name: string }
        >();
        const assignmentClassesMap = new Map<
          number,
          { id: number; name: string }
        >();

        for (const lesson of assignmentLessons) {
          assignmentSubjectsMap.set(lesson.subject.id, lesson.subject);
          assignmentClassesMap.set(lesson.class.id, lesson.class);
        }

        relatedData = {
          subjects: Array.from(assignmentSubjectsMap.values()),
          classes: Array.from(assignmentClassesMap.values()),
          lessons: assignmentLessons.map((lesson) => ({
            id: lesson.id,
            subjectId: lesson.subjectId,
            classId: lesson.classId,
          })),
        };
        break;
      case "result":
        const result = await getAuthUser();
        const resultRole = result?.role;
        const resultUserId = result?.userId;

        const resultStudents = await prisma.student.findMany({
          where:
            resultRole === "teacher"
              ? {
                  class: {
                    lessons: {
                      some: {
                        teacherId: resultUserId!,
                        academicYearId: academicYearId!,
                      },
                    },
                  },
                }
              : undefined,
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });

        const resultExams = await prisma.exam.findMany({
          where: {
            academicYearId: academicYearId!,
            ...(resultRole === "teacher"
              ? { lesson: { teacherId: resultUserId! } }
              : {}),
          },
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                subject: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
          orderBy: [{ title: "asc" }, { id: "asc" }],
        });

        const resultAssignments = await prisma.assignment.findMany({
          where: {
            academicYearId: academicYearId!,
            ...(resultRole === "teacher"
              ? { lesson: { teacherId: resultUserId! } }
              : {}),
          },
          select: {
            id: true,
            title: true,
            lesson: {
              select: {
                subject: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
          orderBy: [{ title: "asc" }, { id: "asc" }],
        });

        relatedData = {
          students: resultStudents,
          exams: resultExams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            subjectName: exam.lesson.subject.name,
            className: exam.lesson.class.name,
          })),
          assignments: resultAssignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            subjectName: assignment.lesson.subject.name,
            className: assignment.lesson.class.name,
          })),
        };
        break;
      case "event":
        const eventClasses = await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { classes: eventClasses };
        break;
      case "announcement":
        const announcementClasses = await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { classes: announcementClasses };
        break;
      case "message":
        const messageClasses = await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        const messageStudents = await prisma.student.findMany({
          select: { id: true, name: true, classId: true },
          orderBy: { name: "asc" },
        });
        const messageParents = await prisma.parent.findMany({
          select: {
            id: true,
            name: true,
            students: {
              select: {
                id: true,
                classId: true,
              },
            },
          },
          orderBy: { name: "asc" },
        });
        const messageTeachers = await prisma.teacher.findMany({
          select: {
            id: true,
            name: true,
            classes: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { name: "asc" },
        });
        relatedData = {
          classes: messageClasses,
          students: messageStudents,
          parents: messageParents,
          teachers: messageTeachers,
        };
        break;
    }
  } else if (table === "class" && id) {
    const classId = typeof id === "string" ? Number.parseInt(id, 10) : id;

    if (!Number.isNaN(classId)) {
      const [classGrades, classTeachers, classItems, currentClass] =
        await prisma.$transaction([
          prisma.grade.findMany({
            select: { id: true, level: true },
          }),
          prisma.teacher.findMany({
            select: { id: true, name: true },
          }),
          prisma.class.findMany({
            where: { id: { not: classId } },
            include: {
              grade: { select: { id: true, level: true } },
              _count: {
                select: {
                  students: true,
                  lessons: true,
                },
              },
            },
            orderBy: { name: "asc" },
          }),
          prisma.class.findUnique({
            where: { id: classId },
            include: {
              grade: { select: { id: true, level: true } },
              supervisor: { select: { id: true, name: true } },
              _count: {
                select: {
                  students: true,
                  lessons: true,
                },
              },
            },
          }),
        ]);

      relatedData = {
        grades: classGrades,
        teachers: classTeachers,
        classes: classItems,
      };
      modalData = currentClass ?? data;
    }
  }
  return (
    <div>
      <FormModal
        table={table}
        type={type}
        data={modalData}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
