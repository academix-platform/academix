"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
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
};

const toList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
};

export default function AiEvaluationCard({
  evaluation,
  maxScore,
  disabledMessage,
  onEvaluate,
}: Props) {
  const router = useRouter();
  const [isEvaluating, startEvaluation] = useTransition();
  const strengths = useMemo(() => toList(evaluation?.strengths), [evaluation]);
  const weaknesses = useMemo(() => toList(evaluation?.weaknesses), [evaluation]);

  const handleEvaluate = () => {
    startEvaluation(async () => {
      const result = await onEvaluate();
      if (result.success) {
        toast.success(result.message ?? "AI evaluation saved.");
        router.refresh();
      } else {
        toast.error(result.message ?? "AI evaluation failed.");
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-md border border-academixPurpleLight bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-academixPurpleDark">
          <Sparkles className="h-4 w-4" />
          AI Evaluation
        </div>
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating || Boolean(disabledMessage)}
          className="inline-flex items-center gap-2 rounded-md bg-academixPurpleDark px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEvaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Evaluate with AI
        </button>
      </div>

      {disabledMessage && (
        <p className="mt-2 text-xs text-gray-400">{disabledMessage}</p>
      )}

      {evaluation?.status === "FAILED" && (
        <div className="mt-3 flex gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{evaluation.error ?? "AI evaluation failed. Manual grading still works."}</span>
        </div>
      )}

      {evaluation && evaluation.status !== "FAILED" && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-academixPurpleLight px-2 py-1 text-xs font-semibold text-academixPurpleDark">
              Applied draft score: {evaluation.score ?? "-"} / {maxScore}
            </span>
            {evaluation.needsReview && (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Needs review
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {evaluation.feedback ?? "No feedback provided."}
          </p>

          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-green-700">Strengths</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {strengths.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-amber-700">Weaknesses</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {weaknesses.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
