import { describe, expect, it } from "vitest";
import {
  getExamEndsAt,
  getTimeRemainingSeconds,
  isPastSubmitWindow,
  SUBMIT_GRACE_MS,
} from "./timing";

const startedAt = new Date("2026-11-03T09:00:00Z");
const endTime = new Date("2026-11-03T12:00:00Z");

describe("getExamEndsAt", () => {
  it("ends at start + duration for a timed exam", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: null },
      { enableTimer: true, duration: 60, endTime },
    );
    expect(endsAt.toISOString()).toBe("2026-11-03T10:00:00.000Z");
  });

  it("adds extra minutes to a timed exam", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: 15 },
      { enableTimer: true, duration: 60, endTime },
    );
    expect(endsAt.toISOString()).toBe("2026-11-03T10:15:00.000Z");
  });

  it("ends at the exam end time when the timer is off", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: null },
      { enableTimer: false, duration: null, endTime },
    );
    expect(endsAt.toISOString()).toBe(endTime.toISOString());
  });

  it("ignores a leftover duration when the timer is off", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: null },
      { enableTimer: false, duration: 30, endTime },
    );
    expect(endsAt.toISOString()).toBe(endTime.toISOString());
  });

  it("falls back to the end time when a timed exam has no duration", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: null },
      { enableTimer: true, duration: null, endTime },
    );
    expect(endsAt.toISOString()).toBe(endTime.toISOString());
  });

  it("extends an untimed exam past its end time", () => {
    const endsAt = getExamEndsAt(
      { startedAt, extraTime: 10 },
      { enableTimer: false, duration: null, endTime },
    );
    expect(endsAt.toISOString()).toBe("2026-11-03T12:10:00.000Z");
  });
});

describe("getTimeRemainingSeconds", () => {
  it("never goes below zero", () => {
    expect(getTimeRemainingSeconds(startedAt, endTime)).toBe(0);
  });

  it("floors to whole seconds", () => {
    const now = new Date(endTime.getTime() - 1500);
    expect(getTimeRemainingSeconds(endTime, now)).toBe(1);
  });
});

describe("isPastSubmitWindow", () => {
  const endsAt = new Date("2026-11-03T10:00:00Z");

  it("still accepts saves and submit just after the deadline", () => {
    expect(isPastSubmitWindow(endsAt, new Date(endsAt.getTime() + 1))).toBe(false);
    expect(isPastSubmitWindow(endsAt, new Date(endsAt.getTime() + SUBMIT_GRACE_MS))).toBe(false);
  });

  it("closes once the grace window has passed", () => {
    expect(isPastSubmitWindow(endsAt, new Date(endsAt.getTime() + SUBMIT_GRACE_MS + 1))).toBe(true);
  });
});
