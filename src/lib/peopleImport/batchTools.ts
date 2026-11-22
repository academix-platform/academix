import "server-only";

import type { ClerkUsers, PersonRole } from "@/lib/people/accounts";

import type { UsernameLookup } from "./logins";

// What saving a batch of students and saving a batch of teachers share:
// running a few rows at once, Clerk calls that wait out a rate limit, and
// emailing new logins after the batch. Passwords are never stored or logged.

export type BatchClerk = ClerkUsers & UsernameLookup;

export type SendEmail = (to: string, username: string, password: string) => Promise<unknown>;

export type Login = {
  role: PersonRole;
  name: string;
  username: string;
  password: string;
  email?: string;
  /** False when the person has no email or it failed: the admin hands this login out. */
  emailed: boolean;
};

/** The longest wait for Clerk's Retry-After before trying a call again. */
const MAX_RETRY_WAIT_SECONDS = 10;

/**
 * Rows saved at the same time. A row makes up to three Clerk calls over about
 * three seconds, so four rows stay far below Clerk's 100 calls per 10 seconds.
 */
export const ROWS_AT_ONCE = 4;

/** Account emails sent at the same time. */
const EMAILS_AT_ONCE = 4;

/** Runs the tasks with at most `limit` running at once, keeping their order in the results. */
export const runLimited = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

/**
 * Why saving stopped: a problem no row can get past, so the import stops
 * instead of failing every row after it.
 * - accountLimit: Clerk won't make more accounts, such as a full user quota.
 * - accountService: Clerk can't be reached, or keeps refusing calls.
 * - saveProblem: the database or something unexpected failed.
 */
export type StopReason = "accountLimit" | "accountService" | "saveProblem";

const statusOf = (err: unknown) =>
  typeof err === "object" && err !== null && "status" in err ? (err as { status: unknown }).status : undefined;

const clerkCodes = (err: unknown): string[] => {
  const errors = typeof err === "object" && err !== null ? (err as { errors?: unknown }).errors : undefined;
  return Array.isArray(errors) ? errors.map((e) => String((e as { code?: unknown } | null)?.code ?? "")) : [];
};

/** A Clerk reply's stop reason, or undefined when only this person's data was refused. */
const clerkStop = (status: number, codes: string[]): StopReason | undefined => {
  if (status !== 429 && codes.some((code) => /quota|limit/i.test(code))) return "accountLimit";
  if (status === 402 || status === 403) return "accountLimit";
  if (status === 400 || status === 404 || status === 422) return undefined;
  return "accountService";
};

/** A failed account creation. `stop` is set when no other account can be made either. */
export class AccountError extends Error {
  constructor(readonly stop?: StopReason) {
    super(stop ?? "account");
    this.name = "AccountError";
  }
}

/** A value taken by someone else, or a record gone since the review: this row's problem only. */
const isRowClash = (err: unknown) => {
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  return code === "P2002" || code === "P2025";
};

/** Why an error should stop the import, or undefined when it only affects its own row. */
export const stopReasonOf = (err: unknown): StopReason | undefined => {
  if (err instanceof AccountError) return err.stop;
  const status = statusOf(err);
  if (typeof status === "number") return clerkStop(status, clerkCodes(err));
  if (isRowClash(err)) return undefined;
  return "saveProblem";
};

/** Remembers the first reason to stop. Rows check it before they start. */
export const stopSignal = () => {
  let reason: StopReason | undefined;
  return {
    stop: (why: StopReason) => {
      reason ??= why;
    },
    get reason() {
      return reason;
    },
  };
};

/**
 * Clerk calls that wait out a rate limit once, as Clerk's 429 reply asks
 * through Retry-After. A failed account creation is marked, so the row can
 * say its login couldn't be made.
 */
export const politeClerk = (
  clerk: BatchClerk,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): BatchClerk => {
  const retry = async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (err) {
      if (statusOf(err) !== 429) throw err;
      const retryAfter = (err as { retryAfter?: number }).retryAfter ?? 1;
      await wait(Math.min(Math.max(retryAfter, 0), MAX_RETRY_WAIT_SECONDS) * 1000);
      return call();
    }
  };
  return {
    createUser: (params) =>
      retry(() => clerk.createUser(params)).catch((err) => {
        const status = statusOf(err);
        // No status means Clerk couldn't be reached at all.
        throw new AccountError(typeof status === "number" ? clerkStop(status, clerkCodes(err)) : "accountService");
      }),
    updateUser: (userId, params) => retry(() => clerk.updateUser(userId, params)),
    deleteUser: (userId) => retry(() => clerk.deleteUser(userId)),
    getUserList: (params) => retry(() => clerk.getUserList(params)),
  };
};

/**
 * Emails each new login to its owner, a few at a time, once everyone is
 * saved. A failed email never undoes the person: the login stays listed for
 * the admin to hand out.
 */
export const emailLogins = (logins: Login[], sendEmail?: SendEmail) =>
  runLimited(
    logins.map((login) => async () => {
      if (!login.email || !sendEmail) return;
      try {
        await sendEmail(login.email, login.username, login.password);
        login.emailed = true;
      } catch (err) {
        // The error's name only: never the address or the password.
        console.error("peopleImport: account email failed", err instanceof Error ? err.name : "unknown error");
      }
    }),
    EMAILS_AT_ONCE,
  );
