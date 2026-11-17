"use client";

import { Select } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FinalResultPeriod = "ANNUAL" | "FIRST" | "SECOND";

type FinalResultPeriodFilterProps = {
  period: FinalResultPeriod;
  options: { value: FinalResultPeriod; label: string }[];
  label: string;
};

const FinalResultPeriodFilter = ({
  period,
  options,
  label,
}: FinalResultPeriodFilterProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    if (value !== "ANNUAL" && value !== "FIRST" && value !== "SECOND") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      value={period}
      onChange={(event) => handleChange(event.target.value)}
      containerClassName="w-full sm:w-44"
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};

export default FinalResultPeriodFilter;
