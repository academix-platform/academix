"use client";

import { AcademicYearItem } from "@/lib/academicYears";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

type StudentsFiltersProps = {
  academicYears: AcademicYearItem[];
  currentAcademicYearId: number;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", labelKey: "regular" },
  { value: "REPEATED", labelKey: "repeated" },
  { value: "GRADUATED", labelKey: "graduated" },
  { value: "LEFT", labelKey: "left" },
] as const;

const REPEAT_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

const StudentsFilters = ({
  academicYears,
  currentAcademicYearId,
}: StudentsFiltersProps) => {
  const t = useTranslations("filters");
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
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedAcademicYearId}
        onChange={(event) =>
          updateParams({ academicYearId: event.target.value })
        }
        containerClassName="w-full sm:w-44"
        aria-label={t("academicYear")}
      >
        {academicYears.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </Select>

      <Select
        value={selectedStatus}
        onChange={(event) => {
          const nextStatus = event.target.value;
          updateParams({
            status: nextStatus,
            repeatCount: nextStatus === "REPEATED" ? "1" : undefined,
          });
        }}
        containerClassName="w-full sm:w-36"
        aria-label={t("status")}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </Select>

      {selectedStatus === "REPEATED" && (
        <Select
          value={selectedRepeatCount}
          onChange={(event) =>
            updateParams({ repeatCount: event.target.value })
          }
          containerClassName="w-full sm:w-32"
          aria-label={t("repeatedTimes")}
        >
          {REPEAT_COUNT_OPTIONS.map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? t("time") : t("times")}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
};

export default StudentsFilters;
