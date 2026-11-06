"use client";

import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type AiActionResult = {
  success: boolean;
  error: boolean;
  message?: string;
};

export type AiEvaluationCardData = {
  id: number;
  status: string;
  score: number | null;
  maxScore: number;
  feedback: string | null;
  strengths: unknown;
  weaknesses: unknown;
  needsReview: boolean;
  error: string | null;
  approvedScore: number | null;
  approvedFeedback: string | null;
};

type Props = {
  evaluation: AiEvaluationCardData | null;
  maxScore: number;
  disabledMessage?: string;
  onEvaluate: () => Promise<AiActionResult>;
  /** Applies the suggestion as the grade, with the score and feedback the teacher confirms. */
  onApprove: (
    evaluationId: number,
    score: number,
    feedback: string,
  ) => Promise<AiActionResult>;
  /** Folds the details away (for table rows). */
  collapsible?: boolean;
};

const toList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
};

function ApproveForm({
  evaluation,
  maxScore,
  onApprove,
}: {
  evaluation: AiEvaluationCardData;
  maxScore: number;
  onApprove: Props["onApprove"];
}) {
  const t = useTranslations("aiEvaluation");
  const router = useRouter();
  const [isApproving, startApproval] = useTransition();
  const [score, setScore] = useState(
    evaluation.score === null ? "" : String(evaluation.score),
  );
  const [feedback, setFeedback] = useState(evaluation.feedback ?? "");

  const numericScore = Number(score);
  const scoreIsValid =
    score.trim() !== "" &&
    Number.isFinite(numericScore) &&
    numericScore >= 0 &&
    numericScore <= maxScore;

  const handleApprove = () => {
    if (!scoreIsValid) return;
    startApproval(async () => {
      const result = await onApprove(evaluation.id, numericScore, feedback);
      if (result.success) {
        toast.success(result.message ?? t("approved"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("failed"));
      }
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        {t("score")}
        <input
          type="number"
          min={0}
          max={maxScore}
          step="any"
          value={score}
          onChange={(event) => setScore(event.target.value)}
          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        {t("feedback")}
        <textarea
          rows={3}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={handleApprove}
        disabled={!scoreIsValid || isApproving}
        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isApproving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        {t("approve")}
      </button>
    </div>
  );
}

export default function AiEvaluationCard({
  evaluation,
  maxScore,
  disabledMessage,
  onEvaluate,
  onApprove,
  collapsible = false,
}: Props) {
  const t = useTranslations("aiEvaluation");
  const router = useRouter();
  const [isEvaluating, startEvaluation] = useTransition();
  const strengths = useMemo(() => toList(evaluation?.strengths), [evaluation]);
  const weaknesses = useMemo(() => toList(evaluation?.weaknesses), [evaluation]);

  const handleEvaluate = () => {
    startEvaluation(async () => {
      const result = await onEvaluate();
      if (result.success) {
        toast.success(result.message ?? t("saved"));
      } else {
        toast.error(result.message ?? t("failed"));
      }
      router.refresh();
    });
  };

  const isApproved = evaluation?.status === "APPROVED";
  const isSuggested = evaluation?.status === "SUGGESTED";

  const summary = evaluation && evaluation.status !== "FAILED" && (
    <div className="flex flex-wrap items-center gap-2">
      {isApproved ? (
        <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
          {t("approvedScore", { score: evaluation.approvedScore ?? "-", maxScore })}
        </span>
      ) : (
        <span className="rounded-md bg-academixPurpleLight px-2 py-1 text-xs font-semibold text-academixPurpleDark">
          {t("suggestedScore", { score: evaluation.score ?? "-", maxScore })}
        </span>
      )}
      {isSuggested && evaluation.needsReview && (
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
          {t("needsReview")}
        </span>
      )}
    </div>
  );

  const details = evaluation && evaluation.status !== "FAILED" && (
    <div className="mt-3 space-y-3">
      {isSuggested && <p className="text-xs text-gray-500">{t("notApplied")}</p>}

      <p className="whitespace-pre-wrap text-sm text-gray-700">
        {(isApproved ? evaluation.approvedFeedback : null) ??
          evaluation.feedback ??
          t("noFeedback")}
      </p>

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className={`grid gap-3 ${collapsible ? "" : "md:grid-cols-2"}`}>
          <div>
            <p className="mb-1 text-xs font-semibold text-green-700">{t("strengths")}</p>
            <ul className="space-y-1 text-xs text-gray-600">
              {strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-amber-700">{t("weaknesses")}</p>
            <ul className="space-y-1 text-xs text-gray-600">
              {weaknesses.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isSuggested && (
        <ApproveForm
          // A new suggestion resets the form.
          key={`${evaluation.id}-${evaluation.score}-${evaluation.feedback}`}
          evaluation={evaluation}
          maxScore={maxScore}
          onApprove={onApprove}
        />
      )}
    </div>
  );

  return (
    <div className="rounded-md border border-academixPurpleLight bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-academixPurpleDark">
          <Sparkles className="h-4 w-4" />
          {t("title")}
        </div>
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating || Boolean(disabledMessage)}
          className="inline-flex items-center gap-2 rounded-md bg-academixPurpleDark px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEvaluating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t("evaluate")}
        </button>
      </div>

      {disabledMessage && <p className="mt-2 text-xs text-gray-400">{disabledMessage}</p>}

      {evaluation?.status === "FAILED" && (
        <div className="mt-3 flex gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{evaluation.error ?? t("manualFallback")}</span>
        </div>
      )}

      {summary &&
        (collapsible ? (
          <details className="mt-3">
            <summary className="cursor-pointer [&>div]:inline-flex">{summary}</summary>
            {details}
          </details>
        ) : (
          <div className="mt-3">
            {summary}
            {details}
          </div>
        ))}
    </div>
  );
}
