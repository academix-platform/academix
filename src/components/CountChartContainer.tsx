import { MoreHorizontal } from "lucide-react";
import CountChart from "./CountChart";
import prisma from "@/lib/prisma";

const CountChartContainer = async () => {
  const data = await prisma.student.groupBy({
    by: ["sex"],
    _count: true,
  });

  const boys = data.find((s) => s.sex === "MALE")?._count || 0;
  const girls = data.find((s) => s.sex === "FEMALE")?._count || 0;

  return (
    <div className="bg-white p-4 rounded-xl w-full h-full">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-lg">Students</h1>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      {/* CHART */}
      <CountChart boys={boys} girls={girls} />
      {/* BOTTOM */}
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="bg-academixSky rounded-full w-5 h-5" />
          <h1 className="font-bold">{boys}</h1>
          <h2 className="text-gray-300 text-xs">
            Boys {Math.round((boys / (boys + girls)) * 100)}%
          </h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-academixYellow rounded-full w-5 h-5" />
          <h1 className="font-bold">{girls}</h1>
          <h2 className="text-gray-300 text-xs">
            Girls {Math.round((girls / (boys + girls)) * 100)}%
          </h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
