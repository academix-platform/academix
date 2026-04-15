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
const calendarMinTime = new Date(2025, 0, 1, 6, 0, 0);
const calendarMaxTime = new Date(2025, 0, 1, 12, 0, 0);

const BigCalendar = ({
  data,
}: {
  data: { title: string; start: Date | string; end: Date | string }[];
}) => {
  const [view, setView] = useState<View>(Views.WEEK);

  const normalizedEvents = useMemo(
    () =>
      data.map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);

        if (end <= start) {
          end.setMinutes(start.getMinutes() + 45);
        }

        return { ...event, start, end };
      }),
    [data],
  );

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={normalizedEvents}
      startAccessor="start"
      endAccessor="end"
      views={[Views.WEEK, Views.DAY]}
      view={view}
      style={{ height: "100%" }}
      onView={handleOnChangeView}
      min={calendarMinTime}
      max={calendarMaxTime}
    />
  );
};

export default BigCalendar;
