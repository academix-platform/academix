import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PASSWORD_ALPHABET,
  PASSWORD_LENGTH,
  generatePassword,
  makeUsername,
  pickFreeUsernames,
  type UsernameLookup,
} from "./logins";

/** Returns the given numbers in turn, as crypto.randomInt would return random ones. */
const sequence = (...values: number[]) => {
  let i = 0;
  return (max: number) => values[i++ % values.length] % max;
};

/** A Clerk lookup that knows the taken usernames and records each call. */
const lookup = (taken: string[]) => {
  const calls: { username: string[]; limit: number }[] = [];
  const clerk: UsernameLookup = {
    async getUserList(params) {
      calls.push(params);
      return { data: params.username.filter((name) => taken.includes(name)).map((username) => ({ username })) };
    },
  };
  return { clerk, calls };
};

afterEach(() => vi.restoreAllMocks());

describe("makeUsername", () => {
  it("is the role letter and six digits", () => {
    expect(makeUsername("student", sequence(4, 8, 2, 9, 1, 3))).toBe("s482913");
    expect(makeUsername("parent", sequence(0, 0, 0, 0, 0, 7))).toBe("p000007");
    expect(makeUsername("teacher", sequence(9))).toBe("t999999");
  });

  it("fits the username rules of the forms and Clerk", () => {
    for (let i = 0; i < 200; i++) {
      const username = makeUsername("student");
      expect(username).toMatch(/^s\d{6}$/);
      expect(username.length).toBeGreaterThanOrEqual(4);
      expect(username.length).toBeLessThanOrEqual(20);
    }
  });
});

describe("generatePassword", () => {
  it("is at least 10 characters", () => {
    expect(PASSWORD_LENGTH).toBeGreaterThanOrEqual(10);
    expect(generatePassword()).toHaveLength(PASSWORD_LENGTH);
  });

  it("never uses characters that look alike", () => {
    expect(PASSWORD_ALPHABET).not.toMatch(/[0Oo1lIi]/);
    for (let i = 0; i < 500; i++) expect(generatePassword()).toMatch(/^[A-HJ-NP-Za-hjkmnp-z2-9]+$/);
  });

  it("always mixes capitals, small letters and digits", () => {
    for (let i = 0; i < 500; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[2-9]/);
    }
  });

  it("tries again until all three kinds are in it", () => {
    // The first 12 picks are all "A", so that password is thrown away.
    const allA = Array(PASSWORD_LENGTH).fill(0);
    const mixed = [0, PASSWORD_ALPHABET.indexOf("b"), PASSWORD_ALPHABET.indexOf("3"), ...Array(PASSWORD_LENGTH - 3).fill(0)];
    expect(generatePassword(sequence(...allA, ...mixed))).toBe("Ab3" + "A".repeat(PASSWORD_LENGTH - 3));
  });

  it("is different each time", () => {
    const passwords = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(passwords.size).toBe(200);
  });
});

describe("pickFreeUsernames", () => {
  it("returns usernames nobody has in Clerk", async () => {
    const { clerk } = lookup([]);
    const usernames = await pickFreeUsernames(clerk, "student", 3);

    expect(usernames).toHaveLength(3);
    expect(new Set(usernames).size).toBe(3);
    usernames.forEach((name) => expect(name).toMatch(/^s\d{6}$/));
  });

  it("tries another username when one is taken", async () => {
    const { clerk, calls } = lookup(["s111111"]);

    const usernames = await pickFreeUsernames(clerk, "student", 1, sequence(1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2));

    expect(usernames).toEqual(["s222222"]);
    expect(calls.map((call) => call.username)).toEqual([["s111111"], ["s222222"]]);
  });

  it("never picks the same username twice in one batch", async () => {
    const { clerk } = lookup([]);

    const usernames = await pickFreeUsernames(clerk, "parent", 2, sequence(3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4));

    expect(usernames).toEqual(["p333333", "p444444"]);
  });

  it("asks Clerk about at most 100 usernames at a time, and for all the matches", async () => {
    const { clerk, calls } = lookup([]);

    await pickFreeUsernames(clerk, "student", 250);

    expect(calls.map((call) => call.username.length)).toEqual([100, 100, 50]);
    calls.forEach((call) => expect(call.limit).toBe(call.username.length));
  });

  it("gives up rather than looping forever", async () => {
    const { clerk } = lookup(["s111111"]);

    await expect(pickFreeUsernames(clerk, "student", 1, sequence(1))).rejects.toThrow("free username");
  });

  it("logs nothing", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );
    const { clerk } = lookup(["s111111"]);

    generatePassword();
    await pickFreeUsernames(clerk, "student", 2);
    await pickFreeUsernames(clerk, "student", 1, sequence(1)).catch(() => {});

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
