import { describe, expect, it } from "vitest";

import { AccountError, stopReasonOf } from "./batchTools";

const clerkError = (status: number, code?: string) =>
  Object.assign(new Error("clerk"), { status, ...(code && { errors: [{ code }] }) });

describe("stopReasonOf", () => {
  it("stops when Clerk won't make more accounts", () => {
    expect(stopReasonOf(clerkError(403))).toBe("accountLimit");
    expect(stopReasonOf(clerkError(402))).toBe("accountLimit");
    expect(stopReasonOf(clerkError(422, "user_quota_exceeded"))).toBe("accountLimit");
  });

  it("stops when Clerk is down or keeps refusing calls", () => {
    expect(stopReasonOf(clerkError(429))).toBe("accountService");
    expect(stopReasonOf(clerkError(429, "rate_limit_exceeded"))).toBe("accountService");
    expect(stopReasonOf(clerkError(500))).toBe("accountService");
    expect(stopReasonOf(clerkError(401))).toBe("accountService");
  });

  it("fails only the row when Clerk refuses that person's data", () => {
    expect(stopReasonOf(clerkError(422))).toBeUndefined();
    expect(stopReasonOf(clerkError(400))).toBeUndefined();
    expect(stopReasonOf(clerkError(404))).toBeUndefined();
  });

  it("fails only the row for a taken value or a record gone since the review", () => {
    expect(stopReasonOf(Object.assign(new Error("unique"), { code: "P2002" }))).toBeUndefined();
    expect(stopReasonOf(Object.assign(new Error("gone"), { code: "P2025" }))).toBeUndefined();
  });

  it("stops on any other error, such as the database being down", () => {
    expect(stopReasonOf(new Error("database down"))).toBe("saveProblem");
    expect(stopReasonOf(Object.assign(new Error("can't reach db"), { code: "P1001" }))).toBe("saveProblem");
  });

  it("uses the reason an account error carries", () => {
    expect(stopReasonOf(new AccountError("accountService"))).toBe("accountService");
    expect(stopReasonOf(new AccountError())).toBeUndefined();
  });
});
