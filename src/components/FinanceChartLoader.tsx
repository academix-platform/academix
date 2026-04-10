"use client";

import dynamic from "next/dynamic";

const FinanceChartLoader = dynamic(() => import("@/components/FinanceChart"), {
  ssr: false,
  loading: () => <div className="bg-white rounded-xl w-full h-full animate-pulse" />,
});

export default FinanceChartLoader;
