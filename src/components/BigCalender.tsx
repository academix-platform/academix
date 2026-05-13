"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { SchoolScheduleSettings } from "@/lib/schoolSettings";

moment.updateLocale(moment.locale(), {
  week: {
    dow: 6,
    doy: 1,
  },
});

const localizer = momentLocalizer(moment);

const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onStoreChange) => {
      const mediaQueryList = window.matchMedia(query);

      // `change` is supported in modern browsers; fallback kept for older Safari.
      const listener = (_event: MediaQueryListEvent) => onStoreChange();
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener("change", listener);
        return () => mediaQueryList.removeEventListener("change", listener);
      }

      mediaQueryList.addListener(listener);
      return () => mediaQueryList.removeListener(listener);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

const toTimeOfDayDate = (hour: number, minute: number) =>
  new Date(2025, 0, 1, hour, minute, 0, 0);

const getSlotStartDate = (
  slot: number,
  settings: Pick<
    SchoolScheduleSettings,
    "workDayStartHour" | "workDayStartMinute" | "lessonDurationMinutes"
  >,
  baseDate?: Date,
) => {
  const startTotalMinutes =
    settings.workDayStartHour * 60 +
    settings.workDayStartMinute +
    (slot - 1) * settings.lessonDurationMinutes;
  const hour = Math.floor(startTotalMinutes / 60);
  const minute = startTotalMinutes % 60;

  if (!baseDate) {
    return toTimeOfDayDate(hour, minute);
  }

  const slotStartDate = new Date(baseDate);
  slotStartDate.setHours(hour, minute, 0, 0);
  return slotStartDate;
};

const getLessonSlot = (
  lessonName: string | undefined,
  lessonsPerDay: number,
) => {
  if (!lessonName) return null;
  const match = /lesson\s*(\d+)/i.exec(lessonName);
  if (!match) return null;

  const slot = Number(match[1]);
  if (Number.isNaN(slot) || slot < 1 || slot > lessonsPerDay) return null;

  return slot;
};

const BigCalendar = ({
  data,
  settings,
}: {
  data: {
    title: string;
    lessonName?: string;
    start: Date | string;
    end: Date | string;
  }[];
  settings: SchoolScheduleSettings;
}) => {
  // Tailwind breakpoints: `lg` starts at 1024px, so "md and below" ~= <1024px.
  const isLgDown = useMediaQuery("(max-width: 1023px)");
  const defaultView = isLgDown ? Views.DAY : Views.WEEK;

  // Keep a user override so toggling views still works.
  const [userView, setUserView] = useState<View | null>(null);
  const view = userView ?? defaultView;

  const calendarMinTime = useMemo(
    () =>
      toTimeOfDayDate(settings.workDayStartHour, settings.workDayStartMinute),
    [settings.workDayStartHour, settings.workDayStartMinute],
  );

  const calendarMaxTime = useMemo(() => {
    const totalMinutes =
      settings.workDayStartHour * 60 +
      settings.workDayStartMinute +
      settings.lessonsPerDay * settings.lessonDurationMinutes;

    return toTimeOfDayDate(Math.floor(totalMinutes / 60), totalMinutes % 60);
  }, [
    settings.lessonDurationMinutes,
    settings.lessonsPerDay,
    settings.workDayStartHour,
    settings.workDayStartMinute,
  ]);

  const normalizedEvents = useMemo(
    () =>
      data.map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);

        if (end <= start) {
          end.setMinutes(start.getMinutes() + settings.lessonDurationMinutes);
        }

        return {
          ...event,
          start,
          end,
          actualStart: start,
          durationMinutes: settings.lessonDurationMinutes,
        };
      }),
    [data, settings.lessonDurationMinutes],
  );

  const EventContent = ({
    event,
  }: {
    event: { title: string; durationMinutes?: number };
  }) => (
    <>
      <span className="lesson-duration">{`${event.durationMinutes ?? 45} min`}</span>
      <span className="rbc-event-content">{event.title}</span>
    </>
  );

  const displayEvents = useMemo(
    () =>
      normalizedEvents.map((event, index) => {
        const fallbackSlot = (index % settings.lessonsPerDay) + 1;
        const slot =
          getLessonSlot(event.lessonName, settings.lessonsPerDay) ??
          fallbackSlot;

        const displayStart = getSlotStartDate(slot, settings, event.start);

        const displayEnd = new Date(displayStart);
        displayEnd.setMinutes(
          displayStart.getMinutes() + settings.lessonDurationMinutes,
        );

        return {
          ...event,
          start: displayStart,
          end: displayEnd,
        };
      }),
    [normalizedEvents, settings],
  );

  const lessonStartLabels = useMemo(() => {
    const labelsByTime = new Map<string, string>();

    for (let slot = 1; slot <= settings.lessonsPerDay; slot += 1) {
      const labelDate = getSlotStartDate(slot, settings);
      const timeKey = moment(labelDate).format("HH:mm");
      labelsByTime.set(timeKey, `Lesson ${slot}`);
    }

    return labelsByTime;
  }, [settings]);

  const timeGutterFormat = (date: Date) => {
    const key = moment(date).format("HH:mm");
    return lessonStartLabels.get(key) ?? "";
  };

  const handleOnChangeView = (selectedView: View) => {
    setUserView(selectedView);
  };

  return (
    <Calendar
      className={view === Views.WEEK ? "calendar-week-mode" : ""}
      localizer={localizer}
      events={displayEvents}
      startAccessor="start"
      endAccessor="end"
      views={[Views.WEEK, Views.DAY]}
      view={view}
      style={{ height: "100%" }}
      onView={handleOnChangeView}
      min={calendarMinTime}
      max={calendarMaxTime}
      step={settings.lessonDurationMinutes}
      timeslots={1}
      formats={{
        timeGutterFormat,
        eventTimeRangeFormat: () => "",
      }}
      components={{ event: EventContent }}
    />
  );
};

export default BigCalendar;
