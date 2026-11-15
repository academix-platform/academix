"use client";

import AiEvaluationCard, {
  AiEvaluationCardData,
} from "@/components/AiEvaluationCard";
import {
  approveAssignmentSubmissionAiEvaluation,
  evaluateAssignmentSubmissionWithAi,
} from "@/lib/actions/aiEvaluation.actions";
import { useTranslations } from "next-intl";

type Props = {
  submissionId: number;
  maxScore: number;
  evaluation: AiEvaluationCardData | null;
  disabled?: boolean;
};

export default function AssignmentSubmissionAiEvaluation({
  submissionId,
  maxScore,
  evaluation,
  disabled,
}: Props) {
  const t = useTranslations("aiEvaluation");

  return (
    <AiEvaluationCard
      collapsible
      maxScore={maxScore}
      evaluation={evaluation}
      disabledMessage={disabled ? t("pdfSubmissionsOnly") : undefined}
      onEvaluate={() => evaluateAssignmentSubmissionWithAi(submissionId)}
      onApprove={approveAssignmentSubmissionAiEvaluation}
    />
  );
}
