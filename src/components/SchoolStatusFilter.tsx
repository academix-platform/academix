"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";

const statuses = ["ALL", "PENDING", "ACTIVE", "PAUSED"] as const;

type Props = {
  className?: string;
};

const SchoolStatusFilter = ({ className }: Props) => {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      value={searchParams.get("status") ?? "ALL"}
      onChange={(e) => onChange(e.target.value)}
      containerClassName={className || "w-full sm:w-36"}
      aria-label={t("status") || "School Status"}
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {status === "ALL" ? t("all") : t(status.toLowerCase())}
        </option>
      ))}
    </Select>
  );
};

export default SchoolStatusFilter;
