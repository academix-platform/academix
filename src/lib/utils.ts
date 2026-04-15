const getLatestSaturday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const latestSaturday = today;
  latestSaturday.setDate(today.getDate() - daysSinceSaturday);
  return latestSaturday;
};

const dayOffsets = {
  SATURDAY: 0,
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
} as const;

type LessonDay = keyof typeof dayOffsets | "FRIDAY";

export const adjustScheduleToCurrentWeek = (
  lessons: {
    title: string;
    day: LessonDay;
    start: Date;
    end: Date;
  }[],
): { title: string; start: Date; end: Date }[] => {
  const latestSaturday = getLatestSaturday();

  return lessons.flatMap((lesson) => {
    // Friday is an off day and should not be shown in the work schedule.
    if (lesson.day === "FRIDAY") {
      return [];
    }

    const daysFromSaturday = dayOffsets[lesson.day];

    const adjustedStartDate = new Date(latestSaturday);

    adjustedStartDate.setDate(latestSaturday.getDate() + daysFromSaturday);
    adjustedStartDate.setHours(
      lesson.start.getHours(),
      lesson.start.getMinutes(),
      lesson.start.getSeconds(),
    );
    const adjustedEndDate = new Date(adjustedStartDate);
    adjustedEndDate.setHours(
      lesson.end.getHours(),
      lesson.end.getMinutes(),
      lesson.end.getSeconds(),
    );

    if (adjustedEndDate <= adjustedStartDate) {
      adjustedEndDate.setMinutes(adjustedStartDate.getMinutes() + 45);
    }

    return [{
      title: lesson.title,
      start: adjustedStartDate,
      end: adjustedEndDate,
    }];
  });
};
