import { describe, expect, it } from "vitest";
import {
  createExamWorkflowSchema,
  extendTimeSchema,
  gradeAnswerSchema,
} from "../formValidationSchemas";

const validExam = {
  title: "Midterm",
  startTime: "2026-11-03T09:00:00Z",
  endTime: "2026-11-03T11:00:00Z",
  subjectId: 1,
  classIds: [1],
  enableTimer: true,
  duration: 60,
  questionsPerPage: 1,
  questions: [
    { text: "2 + 2 = 4", type: "TRUE_FALSE", points: 1, order: 1, correctAnswer: ["TRUE"] },
  ],
};

describe("createExamWorkflowSchema", () => {
  it("accepts a valid exam", () => {
    expect(createExamWorkflowSchema.safeParse(validExam).success).toBe(true);
  });

  it("accepts an untimed exam without a duration", () => {
    const result = createExamWorkflowSchema.safeParse({
      ...validExam,
      enableTimer: false,
      duration: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero questions per page", () => {
    expect(
      createExamWorkflowSchema.safeParse({ ...validExam, questionsPerPage: 0 }).success,
    ).toBe(false);
  });

  it("rejects an end time before the start time", () => {
    expect(
      createExamWorkflowSchema.safeParse({ ...validExam, endTime: "2026-11-03T08:00:00Z" })
        .success,
    ).toBe(false);
  });

  it("rejects a timed exam without a whole-minute duration", () => {
    expect(createExamWorkflowSchema.safeParse({ ...validExam, duration: undefined }).success).toBe(false);
    expect(createExamWorkflowSchema.safeParse({ ...validExam, duration: 1.5 }).success).toBe(false);
  });
});

describe("gradeAnswerSchema", () => {
  it("rejects negative, NaN and infinite scores", () => {
    for (const score of [-1, Number.NaN, Number.POSITIVE_INFINITY, "abc"]) {
      expect(gradeAnswerSchema.safeParse({ answerId: 1, score }).success).toBe(false);
    }
  });

  it("accepts fractional scores", () => {
    expect(gradeAnswerSchema.safeParse({ answerId: 1, score: 2.5 }).success).toBe(true);
  });
});

describe("extendTimeSchema", () => {
  it("rejects negative or huge extensions", () => {
    expect(extendTimeSchema.safeParse({ submissionId: 1, extraMinutes: -9999 }).success).toBe(false);
    expect(extendTimeSchema.safeParse({ submissionId: 1, extraMinutes: 100_000 }).success).toBe(false);
  });

  it("accepts a normal extension", () => {
    expect(extendTimeSchema.safeParse({ submissionId: 1, extraMinutes: 15 }).success).toBe(true);
  });
});
