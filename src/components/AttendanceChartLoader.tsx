"use client";

import dynamic from "next/dynamic";

const AttendanceChartLoader = dynamic(
  () => import("@/components/AttendanceChart"),
  {
    ssr: false,
    loading: () => <div className="bg-white rounded-lg w-full h-full animate-pulse" />,
  }
);

export default AttendanceChartLoader;
