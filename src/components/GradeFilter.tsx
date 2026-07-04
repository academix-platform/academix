"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = {
  grades: {
    id: number;
    level: number;
  }[];
};

export default function GradeFilter({ grades }: Props) {
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
    <select
      defaultValue={searchParams.get("gradeId") || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
    >
      <option value="">{t("allGrades")}</option>

      {grades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          {t("gradeLevel", { level: grade.level })}
        </option>
      ))}
    </select>
  );
}
