"use client";

import { adjustAssignmentSubmissionScores } from "@/lib/actions/submission.actions";
import { Loader2, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

type BulkAction = "increase" | "decrease";

type Props = {
  assignmentId: number;
  maxScore: number;
  classId?: number | null;
  search?: string | null;
  disabled?: boolean;
};

export default function AssignmentSubmissionBulkActions({
  assignmentId,
  maxScore,
  classId,
  search,
  disabled,
}: Props) {
  const t = useTranslations("assignmentSubmissions");
  const router = useRouter();
  const [amount, setAmount] = useState("1");
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filters = {
    classId: classId ?? null,
    search: search ?? null,
  };

  const runAction = (action: BulkAction) => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t("validation.positiveAmount"));
      return;
    }

    if (parsedAmount > maxScore) {
      toast.error(t("validation.maxAmount", { maxScore }));
      return;
    }

    setPendingAction(action);
    startTransition(async () => {
      try {
        const result = await adjustAssignmentSubmissionScores(
          assignmentId,
          action === "increase" ? parsedAmount : -parsedAmount,
          filters,
        );

        if (result.success) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-md">
        <input
          type="number"
          min={0.5}
          max={maxScore}
          step={0.5}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="bg-transparent outline-none w-20 h-8 text-sm"
          aria-label={t("fields.scoreAdjustmentAmount")}
        />
        <span className="text-gray-400 text-xs">{t("fields.marks")}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => runAction("increase")}
          disabled={disabled || isPending}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-3 rounded-md font-semibold text-white text-xs transition disabled:cursor-not-allowed"
        >
          {pendingAction === "increase" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {t("actions.increaseAll")}
        </button>

        <button
          type="button"
          onClick={() => runAction("decrease")}
          disabled={disabled || isPending}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-3 py-3 rounded-md font-semibold text-white text-xs transition disabled:cursor-not-allowed"
        >
          {pendingAction === "decrease" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          {t("actions.decreaseAll")}
        </button>
      </div>
    </div>
  );
}
