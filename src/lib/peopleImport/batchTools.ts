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

export class AccountError extends Error {}

const statusOf = (err: unknown) =>
  typeof err === "object" && err !== null && "status" in err ? (err as { status: unknown }).status : undefined;

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
        throw new AccountError(err instanceof Error ? err.name : "account");
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
