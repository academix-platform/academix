const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const PASSING_AVERAGE = 60;

export type FinalResultStatus = "PASS" | "FAIL" | "NO_RESULTS" | "NOT_UPDATED";

export type FinalResultSummary = {
  averageScore: number | null;
  assessmentCount: number;
  status: FinalResultStatus;
};

export type AssessmentScore = {
  score: number;
  maxScore: number | null;
};

const toPercentage = ({ score, maxScore }: AssessmentScore) => {
  if (!maxScore || maxScore <= 0) return null;
  return (score / maxScore) * 100;
};

export const calculateFinalResultSummary = (
  scores: AssessmentScore[],
): FinalResultSummary => {
  const percentages = scores
    .map(toPercentage)
    .filter((value): value is number => value !== null);

  if (percentages.length === 0) {
    return {
      averageScore: null,
      assessmentCount: 0,
      status: "NO_RESULTS",
    };
  }

  const total = percentages.reduce((sum, percentage) => sum + percentage, 0);
  const roundedAverage = roundTo(total / percentages.length, 2);

  return {
    averageScore: roundedAverage,
    assessmentCount: percentages.length,
    status: roundedAverage >= PASSING_AVERAGE ? "PASS" : "FAIL",
  };
};
