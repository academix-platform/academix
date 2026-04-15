import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId";
  id: string | number;
}) => {
  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      class: {
        select: {
          name: true,
        },
      },
    },
  });

  const data = dataRes.map((lesson) => ({
    title:
      type === "teacherId"
        ? `${lesson.name}/${lesson.class.name}`
        : lesson.name,
    day: lesson.day,
    start: lesson.startTime,
    end: lesson.endTime,
  }));

  const schedule = adjustScheduleToCurrentWeek(data);

  return (
    <div className="h-[560px]">
      <BigCalendar data={schedule} />
    </div>
  );
};

export default BigCalendarContainer;
