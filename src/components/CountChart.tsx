"use client";
import { MoreHorizontal } from "lucide-react";
import Image from "next/image";
import {
  RadialBarChart,
  RadialBar,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Total",
    count: 106,
    fill: "white",
  },
  {
    name: "Girls",
    count: 53,
    fill: "#FAE27C",
  },
  {
    name: "Boys",
    count: 53,
    fill: "#C3EBFA",
  },
];

const CountChart = () => {
  return (
    <div className="bg-white p-4 rounded-xl w-full h-full">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-lg">Students</h1>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      {/* CHART */}
      <div className="relative w-full h-[75%]">
        <ResponsiveContainer>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={32}
            data={data}
          >
            <RadialBar background dataKey="count" />
          </RadialBarChart>
        </ResponsiveContainer>
        <Image
          src="/maleFemale.png"
          alt=""
          width={50}
          height={50}
          className="top-1/2 left-1/2 absolute -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="bg-academixSky rounded-full w-5 h-5" />
          <h1 className="font-bold">1,234</h1>
          <h2 className="text-gray-300 text-xs">Boys (55%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-academixYellow rounded-full w-5 h-5" />
          <h1 className="font-bold">1,234</h1>
          <h2 className="text-gray-300 text-xs">Girls (45%)</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChart;
