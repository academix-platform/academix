import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { getAuthUser } from "@/lib/auth";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";

export type FormContainerProps = {
  table:
    | "grade"
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
  const authUser = await getAuthUser();
  const schoolId = authUser?.schoolId;

  if (type !== "delete") {
    const yearScopedTables: Array<FormContainerProps["table"]> = [
      "lesson",
      "exam",
      "assignment",
      "result",
    ];

    let academicYearId: number | undefined;
    if (yearScopedTables.includes(table)) {
      const currentAcademicYearId = schoolId
        ? await getCurrentAcademicYearIdOrNull(schoolId)
        : null;

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
      case "grade":
        break;
      case "subject":
        if (!schoolId) break;
        const teachers = await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        const grades = await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        });
        relatedData = { teachers, grades };
        break;
      case "class":
        if (!schoolId) break;
        const classGrades = await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        relatedData = { grades: classGrades, teachers: classTeachers };
        break;
      case "lesson":
        if (!schoolId) break;
        const schoolSettings = await getSchoolScheduleSettings(schoolId);
        const lessonClasses = await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true, gradeId: true },
          orderBy: { name: "asc" },
        });
        const lessonSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true, gradeId: true },
          orderBy: { name: "asc" },
        });
        const lessonTeachers = await prisma.teacher.findMany({
          where: { schoolId },
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
          where: { schoolId, academicYearId: academicYearId! },
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
        if (!schoolId) break;
        const teacherSubjects = await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: [{ name: "asc" }],
        });
        relatedData = { subjects: teacherSubjects };
        break;
      case "student":
        if (!schoolId) break;
        const studentGrades = await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          where: { schoolId },
          include: { _count: { select: { students: true } } },
        });
        const studentParents = await prisma.parent.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        relatedData = {
          classes: studentClasses,
          grades: studentGrades,
          parents: studentParents,
        };
        break;
      case "parent":
        if (!schoolId) break;
        const parentStudents = await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, name: true },
        });
        relatedData = { students: parentStudents };
        break;
      case "exam":
        if (!schoolId) break;
        const role = authUser?.role;
        const userId = authUser?.userId;
        const examLessons = await prisma.lesson.findMany({
          where: {
            schoolId,
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
        if (!schoolId) break;
        const assignmentRole = authUser?.role;
        const assignmentUserId = authUser?.userId;
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            schoolId,
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
        const resultRole = authUser?.role;
        const resultUserId = authUser?.userId;
        if (!schoolId) break;

        const resultStudents = await prisma.student.findMany({
          where: {
            schoolId,
            ...(resultRole === "teacher"
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
              : {}),
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });

        const resultExams = await prisma.exam.findMany({
          where: {
            schoolId,
            academicYearId: academicYearId!,
            ...(resultRole === "teacher"
              ? {
                  OR: [
                    { teacherId: resultUserId! },
                    { lesson: { teacherId: resultUserId! } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            title: true,
            subject: { select: { name: true } },
            class: { select: { name: true } },
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
            schoolId,
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
            subjectName: exam.subject?.name ?? exam.lesson?.subject.name ?? "-",
            className: exam.class?.name ?? exam.lesson?.class.name ?? "-",
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
        if (!schoolId) break;
        const eventClasses = await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { classes: eventClasses };
        break;
      case "announcement":
        if (!schoolId) break;
        const announcementClasses = await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        relatedData = { classes: announcementClasses };
        break;
      case "message":
        if (!schoolId) break;
        const messageClasses = await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
        const messageStudents = await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, name: true, classId: true },
          orderBy: { name: "asc" },
        });
        const messageParents = await prisma.parent.findMany({
          where: { schoolId },
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
          where: { schoolId },
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
  } else if (table === "grade" && id) {
    if (!schoolId) {
      return (
        <div>
          <FormModal table={table} type={type} data={data} id={id} relatedData={{}} />
        </div>
      );
    }

    const gradeId = typeof id === "string" ? Number.parseInt(id, 10) : id;

    if (!Number.isNaN(gradeId)) {
      const [grade, classItems] = await prisma.$transaction([
        prisma.grade.findFirst({
          where: { id: gradeId, schoolId },
          select: {
            id: true,
            level: true,
            _count: { select: { classes: true } },
          },
        }),
        prisma.class.findMany({
          where: { schoolId, gradeId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

      relatedData = { classes: classItems };
      modalData = grade ?? data;
    }
  } else if (table === "class" && id) {
    if (!schoolId) {
      return (
        <div>
          <FormModal table={table} type={type} data={data} id={id} relatedData={{}} />
        </div>
      );
    }
    const classId = typeof id === "string" ? Number.parseInt(id, 10) : id;

    if (!Number.isNaN(classId)) {
      const [classGrades, classTeachers, classItems, currentClass] =
        await prisma.$transaction([
          prisma.grade.findMany({
            where: { schoolId },
            select: { id: true, level: true },
          }),
          prisma.teacher.findMany({
            where: { schoolId },
            select: { id: true, name: true },
          }),
          prisma.class.findMany({
            where: { schoolId, id: { not: classId } },
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
          prisma.class.findFirst({
            where: { id: classId, schoolId },
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
  } else if (table === "student" && id) {
    if (!schoolId) {
      return (
        <div>
          <FormModal table={table} type={type} data={data} id={id} relatedData={{}} />
        </div>
      );
    }
    const studentId = typeof id === "string" ? id : String(id);

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        name: true,
        parent: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
        },
      },
    });

    relatedData = { parent: student?.parent ?? null };
    modalData = student ?? data;
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
