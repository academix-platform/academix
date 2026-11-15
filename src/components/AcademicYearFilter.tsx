"use client";

import type { AcademicYearItem } from "@/lib/academicYears";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

type AcademicYearFilterProps = {
  academicYears: Pick<AcademicYearItem, "id" | "name">[];
  currentAcademicYearId: number;
  className?: string;
};

const AcademicYearFilter = ({
  academicYears,
  currentAcademicYearId,
  className,
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
    <Select
      value={selectedAcademicYearId}
      onChange={(event) => handleChange(event.target.value)}
      containerClassName={className || "w-full sm:w-44"}
      aria-label={t("academicYear")}
    >
      {academicYears.map((year) => (
        <option key={year.id} value={year.id}>
          {year.name}
        </option>
      ))}
    </Select>
  );
};

export default AcademicYearFilter;
