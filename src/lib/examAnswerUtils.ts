const ANSWER_SEPARATOR = ",";

export const parseAnswerList = (
  value: string | null | undefined
): string[] => {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    // Fall back to legacy comma-separated storage.
  }

  return trimmed
    .split(ANSWER_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export const parseStoredAnswer = (
  value: string | null | undefined,
  allowMultiple: boolean
): string[] => {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    // Fall back to legacy storage formats below.
  }

  if (!allowMultiple) {
    return [trimmed];
  }

  return parseAnswerList(trimmed);
};

export const serializeAnswerList = (values: string[]): string => {
  return values.map((value) => value.trim()).filter(Boolean).join(ANSWER_SEPARATOR);
};

export const formatAnswerText = (
  value: string | null | undefined
): string => {
  const items = parseAnswerList(value);
  return items.length > 0 ? items.join(", ") : "";
};

export const normalizeStoredAnswer = (
  value: string | null | undefined,
  allowMultiple: boolean
): string | null => {
  if (value == null) return null;

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (!allowMultiple) {
    return trimmed;
  }

  const items = parseStoredAnswer(trimmed, true);
  return items.length > 0 ? JSON.stringify(items) : "";
};

export const answersMatch = (
  studentAnswer: string | null | undefined,
  correctAnswers: string[],
  allowMultiple: boolean
): boolean => {
  const student = parseStoredAnswer(studentAnswer, allowMultiple);
  const correct = [...correctAnswers]
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!allowMultiple) {
    return student.length === 1 && correct.length === 1 && student[0] === correct[0];
  }

  const normalizedStudent = [...student].sort();
  const normalizedCorrect = [...correct].sort();

  if (normalizedStudent.length !== normalizedCorrect.length) return false;

  return normalizedStudent.every((item, index) => item === normalizedCorrect[index]);
};

export const getAutoGradeScore = (
  studentAnswer: string | null | undefined,
  correctAnswers: string[],
  allowMultiple: boolean,
  points: number
): number => {
  const student = parseStoredAnswer(studentAnswer, allowMultiple);
  const correct = [...correctAnswers]
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (correct.length === 0) return 0;

  if (!allowMultiple) {
    return student.length === 1 && correct.length === 1 && student[0] === correct[0]
      ? points
      : 0;
  }

  const studentUnique = [...new Set(student)];
  const correctUnique = [...new Set(correct)];
  const hasWrongChoice = studentUnique.some((item) => !correctUnique.includes(item));

  if (hasWrongChoice || studentUnique.length === 0) {
    return 0;
  }

  if (studentUnique.length === correctUnique.length) {
    return points;
  }

  const partialScore = (studentUnique.length / correctUnique.length) * points;
  return Math.max(0, Math.min(points, partialScore));
};
