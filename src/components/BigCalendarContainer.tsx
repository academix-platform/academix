import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { requireAuth } from "@/lib/auth";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const user = await requireAuth();

  const schoolSettings = await getSchoolScheduleSettings(user.schoolId);
  const academicYearId = await getCurrentAcademicYearIdOrNull(user.schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  if (type === "teacherId") {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: id as string,
        schoolId: user.schoolId,
      },
    });

    if (!teacher) throw new Error("Unauthorized teacher access");
  }

  if (type === "classId") {
    const cls = await prisma.class.findFirst({
      where: {
        id: id as number,
        schoolId: user.schoolId,
      },
    });

    if (!cls) throw new Error("Unauthorized class access");
  }

  const dataRes = await prisma.lesson.findMany({
    where: {
      schoolId: user.schoolId,
      academicYearId,
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      subject: {
        select: { name: true },
      },
      teacher: {
        select: { name: true },
      },
      class: {
        select: { name: true },
      },
    },
  });

  const isPlaceholderSubject = (name?: string | null) => {
    const normalized = name?.trim().toLowerCase();
    return !normalized || normalized === "no subject" || normalized === "free";
  };

  const data = dataRes
    .filter((lesson) => !isPlaceholderSubject(lesson.subject?.name))
    .map((lesson) => ({
      title:
        user.role === "teacher"
          ? (lesson.class?.name ?? lesson.subject.name)
          : user.role === "student"
            ? lesson.subject.name
            : `${lesson.subject.name}/${lesson.teacher.name}`,
      lessonName: lesson.name,
      day: lesson.day,
      start: lesson.startTime,
      end: lesson.endTime,
    }));

  const schedule = adjustScheduleToCurrentWeek(data);

  return (
    <div className="h-[560px]">
      <BigCalendar data={schedule} settings={schoolSettings} />
    </div>
  );
};

export default BigCalendarContainer;
