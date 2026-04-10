"use client";

import dynamic from "next/dynamic";

const BigCalendarLoader = dynamic(() => import("@/components/BigCalender"), {
  ssr: false,
  loading: () => <div className="rounded-md min-h-[720px] animate-pulse" />,
});

export default BigCalendarLoader;
