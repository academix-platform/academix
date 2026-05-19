"use client";

import { updateSchoolSettings } from "@/lib/actions";
import type { SchoolScheduleSettings } from "@/lib/schoolSettings";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  initialSettings: SchoolScheduleSettings;
};

const toTimeValue = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const SchoolSettingsForm = ({ initialSettings }: Props) => {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const [workDayStart, setWorkDayStart] = useState(
    toTimeValue(
      initialSettings.workDayStartHour,
      initialSettings.workDayStartMinute,
    ),
  );
  const [workDayEnd, setWorkDayEnd] = useState(
    toTimeValue(
      initialSettings.workDayEndHour,
      initialSettings.workDayEndMinute,
    ),
  );
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState(
    initialSettings.lessonDurationMinutes,
  );
  const [lessonsPerDay, setLessonsPerDay] = useState(
    initialSettings.lessonsPerDay,
  );

  const totalMinutes = useMemo(
    () => lessonDurationMinutes * lessonsPerDay,
    [lessonDurationMinutes, lessonsPerDay],
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateSchoolSettings(
        { success: false, error: false },
        {
          workDayStart,
          workDayEnd,
          lessonDurationMinutes,
          lessonsPerDay,
        },
      );

      if (result.success) {
        toast("School settings updated.");
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Something went wrong!");
    });
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="block font-semibold text-gray-700 text-sm">
          Schedule Defaults
        </span>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-gray-700 text-sm">
            Work Day Start
          </span>
          <input
            type="time"
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all"
            value={workDayStart}
            onChange={(e) => setWorkDayStart(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-gray-700 text-sm">
            Work Day End
          </span>
          <input
            type="time"
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all"
            value={workDayEnd}
            onChange={(e) => setWorkDayEnd(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-gray-700 text-sm">
            Lesson Duration (minutes)
          </span>
          <input
            type="number"
            min={15}
            max={180}
            step={5}
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all"
            value={lessonDurationMinutes}
            onChange={(e) => setLessonDurationMinutes(Number(e.target.value))}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-gray-700 text-sm">
            Lessons Per Day
          </span>
          <input
            type="number"
            min={1}
            max={12}
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all"
            value={lessonsPerDay}
            onChange={(e) => setLessonsPerDay(Number(e.target.value))}
            required
          />
        </label>
        </div>
      </div>

      <div className="bg-academixPurpleLight p-4 rounded-lg font-medium text-academixPurpleDark text-sm">
        Daily teaching time: {totalMinutes} minutes
      </div>

      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
};

export default SchoolSettingsForm;
