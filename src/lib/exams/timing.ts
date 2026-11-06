type SubmissionTiming = {
  startedAt: Date;
  extraTime: number | null;
};

type ExamTiming = {
  enableTimer: boolean;
  duration: number | null;
  endTime: Date;
};

const MINUTE_MS = 60_000;

/**
 * When a student's attempt stops accepting answers.
 * Timed exams run for `duration` minutes from the student's start; untimed
 * exams (or timed ones missing a duration) stay open until the exam's end time.
 * Extra time granted by a teacher extends either deadline.
 */
export const getExamEndsAt = (
  submission: SubmissionTiming,
  exam: ExamTiming,
): Date => {
  const extraMs = (submission.extraTime ?? 0) * MINUTE_MS;

  if (exam.enableTimer && exam.duration && exam.duration > 0) {
    return new Date(
      submission.startedAt.getTime() + exam.duration * MINUTE_MS + extraMs,
    );
  }

  return new Date(exam.endTime.getTime() + extraMs);
};

export const getTimeRemainingSeconds = (endsAt: Date, now: Date = new Date()) =>
  Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));

/**
 * How long after the deadline the server still accepts the browser's final
 * saves and submit. When time runs out the page flushes unsaved answers and
 * then submits; without this window those last saves would be refused.
 */
export const SUBMIT_GRACE_MS = 30_000;

/** True once the grace window after the deadline has passed. */
export const isPastSubmitWindow = (endsAt: Date, now: Date = new Date()) =>
  now.getTime() > endsAt.getTime() + SUBMIT_GRACE_MS;
