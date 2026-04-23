"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo, useState } from "react";

moment.updateLocale(moment.locale(), {
  week: {
    dow: 6,
    doy: 1,
  },
});

const localizer = momentLocalizer(moment);
const calendarMinTime = new Date(2025, 0, 1, 7, 0, 0);
const calendarMaxTime = new Date(2025, 0, 1, 12, 0, 0);
const SLOT_START_HOUR = 7;
const SLOT_DURATION_MINUTES = 45;
const SLOT_COUNT = 6;

const getLessonSlot = (lessonName?: string) => {
  if (!lessonName) return null;
  const match = /lesson\s*(\d+)/i.exec(lessonName);
  if (!match) return null;

  const slot = Number(match[1]);
  if (Number.isNaN(slot) || slot < 1 || slot > 6) return null;

  return slot;
};

const BigCalendar = ({
  data,
}: {
  data: {
    title: string;
    lessonName?: string;
    start: Date | string;
    end: Date | string;
  }[];
}) => {
  const [view, setView] = useState<View>(Views.WEEK);

  const normalizedEvents = useMemo(
    () =>
      data.map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);

        if (end <= start) {
          end.setMinutes(start.getMinutes() + SLOT_DURATION_MINUTES);
        }

        const durationMinutes = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / 60000),
        );

        return {
          ...event,
          start,
          end,
          actualStart: start,
          durationMinutes,
        };
      }),
    [data],
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
        const fallbackSlot = (index % 6) + 1;
        const slot = getLessonSlot(event.lessonName) ?? fallbackSlot;

        const displayStart = new Date(event.start);
        displayStart.setHours(
          SLOT_START_HOUR,
          (slot - 1) * SLOT_DURATION_MINUTES,
          0,
          0,
        );

        const displayEnd = new Date(displayStart);
        displayEnd.setMinutes(
          displayStart.getMinutes() + SLOT_DURATION_MINUTES,
        );

        return {
          ...event,
          start: displayStart,
          end: displayEnd,
        };
      }),
    [normalizedEvents],
  );

  const lessonStartLabels = useMemo(() => {
    const labelsByTime = new Map<string, string>();

    for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
      const minutes = (slot - 1) * SLOT_DURATION_MINUTES;
      const labelDate = new Date(2025, 0, 1, SLOT_START_HOUR, minutes, 0, 0);
      const timeKey = moment(labelDate).format("HH:mm");
      labelsByTime.set(timeKey, `Lesson ${slot}`);
    }

    return labelsByTime;
  }, []);

  const timeGutterFormat = (date: Date) => {
    const key = moment(date).format("HH:mm");
    return lessonStartLabels.get(key) ?? "";
  };

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
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
      step={SLOT_DURATION_MINUTES}
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
