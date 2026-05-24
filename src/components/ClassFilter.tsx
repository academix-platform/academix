"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  classes: {
    id: number;
    name: string;
  }[];
};

export default function ClassFilter({ classes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (classId) {
      params.set("classId", classId);
    } else {
      params.delete("classId");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      defaultValue={searchParams.get("classId") || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 rounded-md border px-3 text-sm"
    >
      <option value="">All Classes</option>

      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  );
}