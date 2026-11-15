"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

type Props = {
  grades: {
    id: number;
    level: number;
  }[];
  className?: string;
};

export default function GradeFilter({ grades, className }: Props) {
  const t = useTranslations("filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (gradeId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (gradeId) {
      params.set("gradeId", gradeId);
    } else {
      params.delete("gradeId");
    }

    params.delete("classId");
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  return (
    <Select
      value={searchParams.get("gradeId") || ""}
      onChange={(e) => handleChange(e.target.value)}
      containerClassName={className || "w-full sm:w-40"}
      aria-label={t("allGrades")}
    >
      <option value="">{t("allGrades")}</option>

      {grades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {t("gradeLevel", { level: grade.level })}
        </option>
      ))}
    </Select>
  );
}
