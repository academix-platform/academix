"use client";

import { evaluateAssignmentSubmissionWithAi } from "@/lib/actions";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  submissionId: number;
  disabled?: boolean;
};

export default function AssignmentSubmissionAiEvaluation({
  submissionId,
  disabled,
}: Props) {
  const t = useTranslations("aiEvaluation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleEvaluate = () => {
    startTransition(async () => {
      const result = await evaluateAssignmentSubmissionWithAi(submissionId);

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleEvaluate}
      disabled={disabled || isPending}
      title={disabled ? t("pdfSubmissionsOnly") : t("evaluate")}
      className="inline-flex items-center gap-2 rounded-md bg-academixPurpleDark px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {t("evaluate")}
    </button>
  );
}
