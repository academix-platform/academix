"use client";

import type { AcademicYearItem } from "@/lib/academicYears";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type AcademicYearFilterProps = {
  academicYears: Pick<AcademicYearItem, "id" | "name">[];
  currentAcademicYearId: number;
};

const AcademicYearFilter = ({
  academicYears,
  currentAcademicYearId,
}: AcademicYearFilterProps) => {
  const t = useTranslations("filters");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAcademicYearId =
    searchParams.get("academicYearId") ?? String(currentAcademicYearId);

  const handleChange = (academicYearId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("academicYearId", academicYearId);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={selectedAcademicYearId}
      onChange={(event) => handleChange(event.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
      aria-label={t("academicYear")}
    >
      {academicYears.map((year) => (
        <option key={year.id} value={year.id}>
          {year.name}
        </option>
      ))}
    </select>
  );
};

export default AcademicYearFilter;
