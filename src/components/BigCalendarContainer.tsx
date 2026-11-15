import prisma from "@/lib/prisma";
import AcademicSchedule from "./Schedule/AcademicSchedule";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { requireAuth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import {
  type TimetableItem,
  parseSlotFromLesson,
  sanitizeSubjectName,
  getSubjectCategory,
} from "@/lib/scheduleUtils";
import type { SchoolWeekDay } from "@/lib/schoolCalendar";

const BigCalendarContainer = async ({
  type,
  id,
  childName,
  className = "",
}: {
  type: "teacherId" | "classId";
  id: string | number;
  childName?: string;
  className?: string;
}) => {
  const user = await requireAuth();
  const locale = await getLocale();

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

  const items: TimetableItem[] = dataRes
    .filter((lesson) => !isPlaceholderSubject(lesson.subject?.name))
    .map((lesson) => {
      const slot = parseSlotFromLesson(lesson.name, lesson.startTime, schoolSettings);
      const rawSubject = lesson.subject?.name ?? "";
      const subjectName = sanitizeSubjectName(rawSubject, locale);
      const category = getSubjectCategory(rawSubject);

      return {
        id: lesson.id,
        slot,
        day: lesson.day as SchoolWeekDay,
        rawSubject,
        subjectName,
        className: lesson.class?.name ?? "",
        teacherName: lesson.teacher?.name ?? "",
        category,
        startTimeStr: "",
        endTimeStr: "",
      };
    });

  const userRole = (user.role as "teacher" | "student" | "parent") || "student";

  return (
    <AcademicSchedule
      items={items}
      settings={schoolSettings}
      role={userRole}
      locale={locale}
      childName={childName}
      className={className}
    />
  );
};

export default BigCalendarContainer;
