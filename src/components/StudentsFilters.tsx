"use client";

import { AcademicYearItem } from "@/lib/academicYears";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StudentsFiltersProps = {
  academicYears: AcademicYearItem[];
  currentAcademicYearId: number;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Regular" },
  { value: "REPEATED", label: "Repeated" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "LEFT", label: "Left" },
] as const;

const REPEAT_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

const StudentsFilters = ({
  academicYears,
  currentAcademicYearId,
}: StudentsFiltersProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedAcademicYearId =
    searchParams.get("academicYearId") ?? String(currentAcademicYearId);
  const selectedStatus = searchParams.get("status") ?? "ACTIVE";
  const selectedRepeatCount = searchParams.get("repeatCount") ?? "1";

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="hidden sm:flex flex-wrap items-center gap-3">
      <label className="flex flex-col gap-1 text-gray-500 text-xs">
        Academic Year
        <select
          value={selectedAcademicYearId}
          onChange={(event) =>
            updateParams({ academicYearId: event.target.value })
          }
          className="bg-white px-3 py-2 border border-gray-300 rounded-md outline-none min-w-44 text-sm"
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-gray-500 text-xs">
        Status
        <select
          value={selectedStatus}
          onChange={(event) => {
            const nextStatus = event.target.value;
            updateParams({
              status: nextStatus,
              repeatCount: nextStatus === "REPEATED" ? "1" : undefined,
            });
          }}
          className="bg-white px-3 py-2 border border-gray-300 rounded-md outline-none min-w-40 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {selectedStatus === "REPEATED" && (
        <label className="flex flex-col gap-1 text-gray-500 text-xs">
          Repeated Times
          <select
            value={selectedRepeatCount}
            onChange={(event) =>
              updateParams({ repeatCount: event.target.value })
            }
            className="bg-white px-3 py-2 border border-gray-300 rounded-md outline-none min-w-36 text-sm"
          >
            {REPEAT_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "time" : "times"}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};

export default StudentsFilters;
