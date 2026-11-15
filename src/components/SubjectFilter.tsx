"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Select } from "@/components/ui/select";

type Props = {
  subjects: {
    id: number;
    name: string;
    gradeId?: number | null;
  }[];
  classes?: {
    id: number;
    gradeId?: number | null;
  }[];
  className?: string;
};

export default function SubjectFilter({ subjects, classes = [], className }: Props) {
  const t = useTranslations("filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedClassId = searchParams.get("classId");
  const selectedClass = classes.find(
    (classItem) => String(classItem.id) === selectedClassId,
  );
  const filteredSubjects =
    selectedClassId && selectedClass?.gradeId
      ? subjects.filter(
          (subject) =>
            String(subject.gradeId) === String(selectedClass.gradeId),
        )
      : subjects;
  const currentSubjectId = searchParams.get("subjectId") || "";
  const selectedSubjectExists = filteredSubjects.some(
    (subject) => String(subject.id) === currentSubjectId,
  );

  useEffect(() => {
    if (!selectedClassId || !currentSubjectId || selectedSubjectExists) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("subjectId");
    params.set("page", "1");
    router.replace(`?${params.toString()}`);
  }, [
    currentSubjectId,
    router,
    searchParams,
    selectedClassId,
    selectedSubjectExists,
  ]);

  const handleChange = (subjectId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (subjectId) {
      params.set("subjectId", subjectId);
    } else {
      params.delete("subjectId");
    }

    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  return (
    <Select
      value={selectedSubjectExists ? currentSubjectId : ""}
      onChange={(e) => handleChange(e.target.value)}
      containerClassName={className || "w-full sm:w-40"}
      aria-label={t("allSubjects")}
    >
      <option value="">{t("allSubjects")}</option>

      {filteredSubjects.map((subject) => (
        <option key={subject.id} value={subject.id}>
          {subject.name}
        </option>
      ))}
    </Select>
  );
}
