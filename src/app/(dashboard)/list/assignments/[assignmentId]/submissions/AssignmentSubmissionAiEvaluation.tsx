"use client";

import AiEvaluationCard, {
  AiEvaluationCardData,
} from "@/components/AiEvaluationCard";
import { evaluateAssignmentSubmissionWithAi } from "@/lib/actions";

type Props = {
  submissionId: number;
  maxScore: number;
  evaluation: AiEvaluationCardData | null;
  disabledMessage?: string;
};

export default function AssignmentSubmissionAiEvaluation({
  submissionId,
  maxScore,
  evaluation,
  disabledMessage,
}: Props) {
  return (
    <AiEvaluationCard
      maxScore={maxScore}
      evaluation={evaluation}
      disabledMessage={disabledMessage}
      onEvaluate={() => evaluateAssignmentSubmissionWithAi(submissionId)}
    />
  );
}
