import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const schoolSettings = await getSchoolScheduleSettings();

  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      subject: {
        select: {
          name: true,
        },
      },
      teacher: {
        select: {
          name: true,
        },
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
      title: `${lesson.subject.name}/${lesson.teacher.name}`,
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
