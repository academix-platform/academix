"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  grades: {
    id: number;
    level: number;
  }[];
};

export default function GradeFilter({ grades }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (gradeId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (gradeId) {
      params.set("gradeId", gradeId);
    } else {
      params.delete("gradeId");
    }

    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  return (
    <select
      defaultValue={searchParams.get("gradeId") || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
    >
      <option value="">All Grades</option>

      {grades.map((grade) => (
        <option key={grade.id} value={grade.id}>
          Grade {grade.level}
        </option>
      ))}
    </select>
  );
}