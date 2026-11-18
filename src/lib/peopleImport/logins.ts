import "server-only";
import { randomInt } from "node:crypto";

import type { PersonRole } from "@/lib/people/accounts";

// Usernames and passwords for imported people. Nothing here is logged or
// stored: passwords go to Clerk, and are shown to the admin once.

type RandomInt = (max: number) => number;
const secureRandom: RandomInt = (max) => randomInt(max);

const ROLE_LETTERS: Record<PersonRole, string> = { student: "s", parent: "p", teacher: "t" };
const USERNAME_DIGITS = 6;

/** A role letter and six digits, such as "s482913": within the forms' 4 to 20 characters. */
export const makeUsername = (role: PersonRole, random: RandomInt = secureRandom) =>
  ROLE_LETTERS[role] + Array.from({ length: USERNAME_DIGITS }, () => random(10)).join("");

/** Letters and digits without look-alikes: no 0, O, o, 1, l, I or i. */
export const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const PASSWORD_LENGTH = 12;

/**
 * A random password with capitals, small letters and digits. Clerk also
 * refuses passwords found in breaches, which a random 12 characters won't be.
 * Source: https://clerk.com/docs/reference/backend/user/create-user
 */
export const generatePassword = (random: RandomInt = secureRandom): string => {
  for (;;) {
    const password = Array.from(
      { length: PASSWORD_LENGTH },
      () => PASSWORD_ALPHABET[random(PASSWORD_ALPHABET.length)],
    ).join("");
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) return password;
  }
};

/** The one Clerk call used to check usernames, so tests can pass a fake. */
export type UsernameLookup = {
  getUserList(params: { username: string[]; limit: number }): Promise<{ data: { username: string | null }[] }>;
};

// Clerk's user list "Accepts up to 100 usernames", and returns 10 users unless
// `limit` is raised. Source: https://clerk.com/docs/reference/backend/user/get-user-list
const CLERK_USERNAMES_PER_LOOKUP = 100;
const MAX_ROUNDS = 5;

const takenInClerk = async (clerk: UsernameLookup, usernames: string[]) => {
  const taken = new Set<string>();
  for (let i = 0; i < usernames.length; i += CLERK_USERNAMES_PER_LOOKUP) {
    const chunk = usernames.slice(i, i + CLERK_USERNAMES_PER_LOOKUP);
    const { data } = await clerk.getUserList({ username: chunk, limit: chunk.length });
    for (const user of data) if (user.username) taken.add(user.username);
  }
  return taken;
};

/**
 * Picks `count` different usernames that no Clerk account has yet. A taken
 * one is replaced and checked again. Two imports at the same moment could still
 * pick the same name; Clerk then refuses the second account, and that row fails.
 */
export const pickFreeUsernames = async (
  clerk: UsernameLookup,
  role: PersonRole,
  count: number,
  random: RandomInt = secureRandom,
): Promise<string[]> => {
  const free: string[] = [];
  const ruledOut = new Set<string>();

  for (let round = 0; round < MAX_ROUNDS && free.length < count; round++) {
    const candidates = new Set<string>();
    for (let tries = 0; candidates.size < count - free.length && tries < count * 10; tries++) {
      const username = makeUsername(role, random);
      if (!ruledOut.has(username)) candidates.add(username);
    }

    const taken = await takenInClerk(clerk, [...candidates]);
    for (const username of candidates) {
      ruledOut.add(username);
      if (!taken.has(username)) free.push(username);
    }
  }

  if (free.length < count) throw new Error("Couldn't find a free username. Try again.");
  return free;
};
