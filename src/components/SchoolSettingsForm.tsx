"use client";

import { updateSchoolSettings } from "@/lib/actions";
import type { SchoolScheduleSettings } from "@/lib/schoolSettings";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  initialSettings: SchoolScheduleSettings;
};

const toTimeValue = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const SchoolSettingsForm = ({ initialSettings }: Props) => {
  const t = useTranslations("settings.scheduleForm");
  const settingsT = useTranslations("settings");
  const actionsT = useTranslations("actions");
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
        toast(t("updated"));
        router.refresh();
        return;
      }

      toast.error(result.message ?? actionsT("somethingWentWrong"));
    });
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="bg-surface border border-outline/80 p-6 rounded-2xl shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-content-primary tracking-tight">
            {t("title")}
          </h3>
          <p className="text-xs sm:text-sm text-content-muted mt-1">
            {settingsT("description")}
          </p>
        </div>

        <div className="gap-6 grid grid-cols-1 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
              {t("workDayStart")}
            </span>
            <input
              type="time"
              className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
              value={workDayStart}
              onChange={(e) => setWorkDayStart(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
              {t("workDayEnd")}
            </span>
            <input
              type="time"
              className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
              value={workDayEnd}
              onChange={(e) => setWorkDayEnd(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
              {t("lessonDuration")}
            </span>
            <input
              type="number"
              min={15}
              max={180}
              step={5}
              className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium tabular-nums"
              value={lessonDurationMinutes}
              onChange={(e) => setLessonDurationMinutes(Number(e.target.value))}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
              {t("lessonsPerDay")}
            </span>
            <input
              type="number"
              min={1}
              max={12}
              className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium tabular-nums"
              value={lessonsPerDay}
              onChange={(e) => setLessonsPerDay(Number(e.target.value))}
              required
            />
          </label>
        </div>

        <div className="pt-4 border-t border-outline/60 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? actionsT("saving") : t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default SchoolSettingsForm;
