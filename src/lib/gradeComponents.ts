export const DEFAULT_GRADE_COMPONENTS = [
  { key: "EXAM", name: "Exam" },
  { key: "QUIZ", name: "Quiz" },
  { key: "ASSIGNMENT", name: "Assignment" },
  { key: "CLASSWORK", name: "Classwork" },
  { key: "PROJECT", name: "Project" },
  { key: "PARTICIPATION", name: "Participation" },
] as const;

export type GradeComponentKey =
  (typeof DEFAULT_GRADE_COMPONENTS)[number]["key"];

export type WeightedGradeComponent = {
  id: number;
  weight: number;
};

export type WeightedGradeScore = {
  gradeSchemeComponentId: number;
  score: number;
  maxScore: number;
};

export type WeightedGradePeriod = "FIRST" | "SECOND";

export type WeightedGradeSemesterScore = WeightedGradeScore & {
  semester: WeightedGradePeriod;
};

export type WeightedGradeSemesterScheme = {
  semester: WeightedGradePeriod;
  components: WeightedGradeComponent[];
};

export type WeightedGradeSummary = {
  averageScore: number | null;
  assessmentCount: number;
  complete: boolean;
};

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

export const hasValidGradeComponentWeights = (
  components: { weight: number }[],
) =>
  components.length > 0 &&
  components.every(
    ({ weight }) => Number.isFinite(weight) && weight > 0 && weight <= 100,
  ) &&
  Math.abs(
    components.reduce((total, { weight }) => total + weight, 0) - 100,
  ) < 0.01;

export const calculateWeightedGrade = (
  components: WeightedGradeComponent[],
  scores: WeightedGradeScore[],
): WeightedGradeSummary => {
  const componentIds = new Set(components.map(({ id }) => id));
  const scoreCount = scores.filter((score) =>
    componentIds.has(score.gradeSchemeComponentId),
  ).length;

  if (!hasValidGradeComponentWeights(components)) {
    return { averageScore: null, assessmentCount: scoreCount, complete: false };
  }

  let weightedTotal = 0;
  for (const component of components) {
    const componentScores = scores.filter(
      (score) => score.gradeSchemeComponentId === component.id,
    );
    if (componentScores.length === 0) {
      return { averageScore: null, assessmentCount: scoreCount, complete: false };
    }

    const percentages = componentScores.map(({ score, maxScore }) =>
      maxScore > 0 && Number.isFinite(score) && Number.isFinite(maxScore)
        ? (score / maxScore) * 100
        : null,
    );
    if (!percentages.every((percentage): percentage is number => percentage !== null)) {
      return { averageScore: null, assessmentCount: scoreCount, complete: false };
    }

    const componentAverage =
      percentages.reduce((total, percentage) => total + percentage, 0) /
      percentages.length;
    weightedTotal += componentAverage * (component.weight / 100);
  }

  return {
    averageScore: roundToTwo(weightedTotal),
    assessmentCount: scoreCount,
    complete: true,
  };
};

export const calculateWeightedSemesterGrade = (
  schemes: { components: WeightedGradeComponent[] }[],
  scores: WeightedGradeScore[],
): WeightedGradeSummary => {
  if (schemes.length === 0) {
    return { averageScore: null, assessmentCount: scores.length, complete: false };
  }

  const schemeComponentIds = new Set(
    schemes.flatMap((scheme) => scheme.components.map(({ id }) => id)),
  );
  const schemeScores = scores.filter((score) =>
    schemeComponentIds.has(score.gradeSchemeComponentId),
  );
  const schemeSummaries = schemes.map((scheme) =>
    calculateWeightedGrade(scheme.components, schemeScores),
  );
  const assessmentCount = schemeSummaries.reduce(
    (total, summary) => total + summary.assessmentCount,
    0,
  );

  if (schemeSummaries.some((summary) => !summary.complete)) {
    return { averageScore: null, assessmentCount, complete: false };
  }

  const averageScore =
    schemeSummaries.reduce(
      (total, summary) => total + (summary.averageScore ?? 0),
      0,
    ) / schemeSummaries.length;

  return {
    averageScore: roundToTwo(averageScore),
    assessmentCount,
    complete: true,
  };
};

export const calculateAnnualGrade = (
  firstSemester: WeightedGradeSummary,
  secondSemester: WeightedGradeSummary,
): WeightedGradeSummary => {
  if (
    !firstSemester.complete ||
    !secondSemester.complete ||
    firstSemester.averageScore === null ||
    secondSemester.averageScore === null
  ) {
    return {
      averageScore: null,
      assessmentCount:
        firstSemester.assessmentCount + secondSemester.assessmentCount,
      complete: false,
    };
  }

  return {
    averageScore: roundToTwo(
      (firstSemester.averageScore + secondSemester.averageScore) / 2,
    ),
    assessmentCount:
      firstSemester.assessmentCount + secondSemester.assessmentCount,
    complete: true,
  };
};

export const calculateWeightedAcademicYearGrade = (
  schemes: WeightedGradeSemesterScheme[],
  scores: WeightedGradeSemesterScore[],
): WeightedGradeSummary | null => {
  if (schemes.length === 0) return null;

  const firstSemester = calculateWeightedSemesterGrade(
    schemes
      .filter((scheme) => scheme.semester === "FIRST")
      .map(({ components }) => ({ components })),
    scores
      .filter((score) => score.semester === "FIRST")
      .map(({ gradeSchemeComponentId, score, maxScore }) => ({
        gradeSchemeComponentId,
        score,
        maxScore,
      })),
  );
  const secondSemester = calculateWeightedSemesterGrade(
    schemes
      .filter((scheme) => scheme.semester === "SECOND")
      .map(({ components }) => ({ components })),
    scores
      .filter((score) => score.semester === "SECOND")
      .map(({ gradeSchemeComponentId, score, maxScore }) => ({
        gradeSchemeComponentId,
        score,
        maxScore,
      })),
  );

  return calculateAnnualGrade(firstSemester, secondSemester);
};
