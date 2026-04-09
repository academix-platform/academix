"use client";

import dynamic from "next/dynamic";

const EventCalendarLoader = dynamic(() => import("@/components/EventCalendar"), {
  ssr: false,
  loading: () => <div className="bg-white rounded-md min-h-[420px] animate-pulse" />,
});

export default EventCalendarLoader;
