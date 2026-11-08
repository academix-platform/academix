"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

type AssessmentOption = { value: string; label: string };

/** Opens the chosen assessment as soon as it is picked. */
const AssessmentSelect = ({ options, value }: { options: AssessmentOption[]; value: string }) => {
  const t = useTranslations("classEntry");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{t("assessmentLabel")}</span>
      <span className="flex items-center gap-2">
        <select
          name="assessment"
          value={value}
          disabled={isPending}
          aria-busy={isPending}
          onChange={(e) => {
            const chosen = e.target.value;
            startTransition(() => {
              router.push(
                chosen
                  ? `/list/results/class-entry?assessment=${encodeURIComponent(chosen)}`
                  : "/list/results/class-entry",
              );
            });
          }}
          className="disabled:opacity-60 p-2 border rounded-md max-w-full text-sm"
        >
          <option value="">{t("chooseAssessment")}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isPending && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" aria-hidden />}
      </span>
    </label>
  );
};

export default AssessmentSelect;
