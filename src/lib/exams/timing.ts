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
