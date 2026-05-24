"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  subjects: {
    id: number;
    name: string;
  }[];
};

export default function SubjectFilter({ subjects }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <select
      defaultValue={searchParams.get("subjectId") || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
    >
      <option value="">All Subjects</option>

      {subjects.map((subject) => (
        <option key={subject.id} value={subject.id}>
          {subject.name}
        </option>
      ))}
    </select>
  );
}