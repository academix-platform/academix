"use client";

import AiEvaluationCard, {
  AiEvaluationCardData,
} from "@/components/AiEvaluationCard";
import { evaluateExamAnswerWithAi } from "@/lib/actions";

type Props = {
  answerId: number;
  maxScore: number;
  evaluation: AiEvaluationCardData | null;
  disabledMessage?: string;
};

export default function GradeAnswerAiEvaluation({
  answerId,
  maxScore,
  evaluation,
  disabledMessage,
}: Props) {
  return (
    <AiEvaluationCard
      maxScore={maxScore}
      evaluation={evaluation}
      disabledMessage={disabledMessage}
      onEvaluate={() => evaluateExamAnswerWithAi(answerId)}
    />
  );
}
