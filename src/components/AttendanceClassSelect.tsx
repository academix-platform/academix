"use client";

import { useRouter, useSearchParams } from "next/navigation";

const AttendanceClassSelect = ({
  classes,
  value,
  selectedDate,
}: {
  classes: { id: number; name: string }[];
  value: number | undefined;
  selectedDate: string;
}) => {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const newParams = new URLSearchParams(params.toString());

        newParams.set("classId", e.target.value);
        newParams.set("scope", "students");
        newParams.set("date", selectedDate);

        router.push(`/list/attendance?${newParams.toString()}`);
      }}
      className="p-2 border rounded-md text-sm"
    >
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  );
};

export default AttendanceClassSelect;
