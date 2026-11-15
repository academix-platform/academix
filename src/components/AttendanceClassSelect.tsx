"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

type Props = {
  classes: { id: number; name: string }[];
  value: number | undefined;
  selectedDate: string;
  className?: string;
};

const AttendanceClassSelect = ({
  classes,
  value,
  selectedDate,
  className,
}: Props) => {
  const router = useRouter();
  const params = useSearchParams();
  const th = useTranslations("tableHeaders");

  const handleChange = (classIdStr: string) => {
    const newParams = new URLSearchParams(params.toString());

    if (classIdStr) {
      newParams.set("classId", classIdStr);
    } else {
      newParams.delete("classId");
    }

    newParams.set("scope", "students");
    newParams.set("date", selectedDate);
    newParams.set("page", "1");

    router.push(`/list/attendance?${newParams.toString()}`);
  };

  return (
    <Select
      value={value ? String(value) : ""}
      onChange={(e) => handleChange(e.target.value)}
      containerClassName={className || "w-full sm:w-44"}
      aria-label={th("class")}
    >
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </Select>
  );
};

export default AttendanceClassSelect;
