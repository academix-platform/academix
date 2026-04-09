"use client";

import dynamic from "next/dynamic";

const CountChartLoader = dynamic(() => import("@/components/CountChart"), {
  ssr: false,
  loading: () => <div className="bg-white rounded-xl w-full h-full animate-pulse" />,
});

export default CountChartLoader;
