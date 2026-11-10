"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const dayLabels: Record<string, { en: string; ar: string }> = {
  Sat: { en: "Sat", ar: "السبت" },
  Sun: { en: "Sun", ar: "الأحد" },
  Mon: { en: "Mon", ar: "الإثنين" },
  Tue: { en: "Tue", ar: "الثلاثاء" },
  Wed: { en: "Wed", ar: "الأربعاء" },
  Thu: { en: "Thu", ar: "الخميس" },
};

type AttendanceItem = {
  name: string;
  present: number;
  absent: number;
};

type AttendanceChartProps = {
  data: AttendanceItem[];
  totalRecords?: number;
  totalStudents?: number;
};

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  t: (key: string) => string;
  totalStudents?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  t,
  totalStudents = 0,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-outline rounded-xl p-3 shadow-md text-xs font-sans space-y-2 min-w-[150px]">
        <p className="font-semibold text-content-primary pb-1.5 border-b border-outline/60">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry) => {
            const count = entry.value;
            const pct =
              totalStudents > 0
                ? Math.round(((count / totalStudents) * 100) * 10) / 10
                : 0;
            const formattedPct = `${pct}%`;

            return (
              <div
                key={entry.dataKey}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-content-secondary">
                    {entry.dataKey === "present" ? t("present") : t("absent")}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold tabular-nums text-content-primary">
                    {formattedPct}
                  </span>
                  <span className="text-[10px] text-content-muted tabular-nums">
                    ({count})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {totalStudents > 0 && (
          <div className="pt-1.5 border-t border-outline/60 flex items-center justify-between text-[10px] text-content-muted">
            <span>{t("totalStudents")}</span>
            <span className="font-semibold text-content-secondary tabular-nums">
              {totalStudents}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const AttendanceChart = ({ data, totalStudents = 0 }: AttendanceChartProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const locale = useLocale();
  const t = useTranslations("attendance");
  const isRtl = locale === "ar";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const chartData = data.map((item) => ({
    ...item,
    displayName: isRtl
      ? dayLabels[item.name]?.ar || item.name
      : dayLabels[item.name]?.en || item.name,
  }));

  if (!isMounted) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brandPurple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-[340px]">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={chartData}
          barSize={18}
          margin={{
            top: 10,
            right: isRtl ? 10 : 20,
            left: isRtl ? 20 : 10,
            bottom: 15,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="displayName"
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fill: "#64748b", fontSize: 12, fontFamily: "inherit" }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 12, fontFamily: "inherit" }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip t={t} totalStudents={totalStudents} />}
            cursor={{ fill: "rgba(124, 58, 237, 0.04)" }}
          />
          <Legend
            align={isRtl ? "right" : "left"}
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "4px", paddingBottom: "24px" }}
            formatter={(value) => (
              <span className="text-xs font-medium text-content-secondary px-1">
                {value === "present"
                  ? t("present")
                  : value === "absent"
                  ? t("absent")
                  : value}
              </span>
            )}
          />
          <Bar
            dataKey="present"
            name="present"
            fill="#7C3AED"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="absent"
            name="absent"
            fill="#F43F5E"
            legendType="circle"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;
