"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Select } from "@/components/ui/select";

type Props = {
  classes: {
    id: number;
    name: string;
    gradeId?: number | null;
  }[];
  className?: string;
};

export default function ClassFilter({ classes, className }: Props) {
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
    <Select
      value={selectedClassExists ? currentClassId : ""}
      onChange={(e) => handleChange(e.target.value)}
      containerClassName={className || "w-full sm:w-40"}
      aria-label={t("allClasses")}
    >
      <option value="">{t("allClasses")}</option>

      {filteredClasses.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </Select>
  );
}
