"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

type Props = {
  classes: {
    id: number;
    name: string;
    gradeId?: number | null;
  }[];
};

export default function ClassFilter({ classes }: Props) {
  const t = useTranslations("filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedGradeId = searchParams.get("gradeId");
  const filteredClasses = selectedGradeId
    ? classes.filter((cls) => String(cls.gradeId) === selectedGradeId)
    : classes;
  const currentClassId = searchParams.get("classId") || "";
  const selectedClassExists = filteredClasses.some(
    (cls) => String(cls.id) === currentClassId,
  );

  useEffect(() => {
    if (!selectedGradeId || !currentClassId || selectedClassExists) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("classId");
    params.set("page", "1");
    router.replace(`?${params.toString()}`);
  }, [
    currentClassId,
    router,
    searchParams,
    selectedClassExists,
    selectedGradeId,
  ]);

  const handleChange = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (classId) {
      params.set("classId", classId);
    } else {
      params.delete("classId");
    }

    params.delete("subjectId");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={selectedClassExists ? currentClassId : ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
    >
      <option value="">{t("allClasses")}</option>

      {filteredClasses.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  );
}
