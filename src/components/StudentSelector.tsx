"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ClassOption = {
  id: number;
  name: string;
};

const StudentSelector = ({
  classes,
  selectedClassId,
  label,
}: {
  classes: ClassOption[];
  selectedClassId: number;
  label: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("studentId");
    params.set("classId", classId);
    router.push(`?${params.toString()}`);
  };

  return (
    <label className="flex flex-col gap-1 min-w-48 text-sm">
      <span className="text-gray-500">{label}</span>
      <select
        value={selectedClassId}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-md outline-none text-sm"
      >
        {classes.map((classOption) => (
          <option key={classOption.id} value={classOption.id}>
            {classOption.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export default StudentSelector;
