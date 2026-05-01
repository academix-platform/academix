"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Student = {
  id: string;
  name: string;
  classId: number;
};

const StudentSelector = ({ students }: { students: Student[] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = searchParams.get("studentId") || students[0]?.id;

  const handleChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", id);
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      className="mb-4 p-2 border rounded-md"
    >
      {students.map((student) => (
        <option key={student.id} value={student.id}>
          {student.name}
        </option>
      ))}
    </select>
  );
};

export default StudentSelector;
