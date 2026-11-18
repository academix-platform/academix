import { describe, expect, it } from "vitest";

import { createParentWith, updateParentWith, type ParentDeps } from "./parents";
import { fakeClerk, fakePeopleDb, type FakePeopleData } from "./testing/fakePeopleDb";

const SCHOOL = 1;
const OTHER_SCHOOL = 2;

const setup = (data: FakePeopleData = {}) => {
  const people = fakePeopleDb({
    students: [
      { id: "lina", schoolId: SCHOOL, classId: 10 },
      { id: "omar", schoolId: SCHOOL, classId: 10 },
      { id: "elsewhere", schoolId: OTHER_SCHOOL, classId: 20 },
    ],
    ...data,
  });
  const accounts = fakeClerk();
  const deps = { db: people.db, clerk: accounts.clerk } as unknown as ParentDeps;
  return { ...people, ...accounts, deps };
};

const newParent = {
  username: "p482913",
  password: "Kp7mWq3xRt",
  name: "Sami Haddad",
  phone: "0599123456",
  studentIds: ["lina", "omar"],
};

describe("createParentWith", () => {
  it("creates the login and the parent, linked to their children", async () => {
    const { deps, tables, users } = setup();

    expect(await createParentWith(deps, SCHOOL, newParent)).toEqual({ ok: true, id: "user_1" });

    expect(users.get("user_1")).toMatchObject({ role: "parent" });
    expect(tables.parents).toEqual([expect.objectContaining({ id: "user_1", schoolId: SCHOOL, address: null })]);
    expect(tables.students.filter((s) => s.parentId === "user_1").map((s) => s.id)).toEqual(["lina", "omar"]);
  });

  it("never writes the password to the database", async () => {
    const { deps, writes } = setup();

    await createParentWith(deps, SCHOOL, newParent);

    expect(JSON.stringify(writes)).not.toContain("Kp7mWq3xRt");
  });

  it("needs at least one child", async () => {
    const { deps, calls } = setup();

    expect(await createParentWith(deps, SCHOOL, { ...newParent, studentIds: [] })).toEqual({
      ok: false,
      problem: "noStudents",
    });
    expect(calls).toEqual([]);
  });

  it("refuses a child from another school", async () => {
    const { deps, calls, tables } = setup();

    expect(await createParentWith(deps, SCHOOL, { ...newParent, studentIds: ["lina", "elsewhere"] })).toEqual({
      ok: false,
      problem: "studentNotFound",
    });
    expect(calls).toEqual([]);
    expect(tables.parents).toEqual([]);
  });

  it("deletes the new login when the parent can't be saved", async () => {
    const { deps, failures, users } = setup();
    failures.parentCreate = true;

    await expect(createParentWith(deps, SCHOOL, newParent)).rejects.toThrow("parent create failed");
    expect(users.size).toBe(0);
  });
});

describe("updateParentWith", () => {
  const existing = { id: "sami", schoolId: SCHOOL, phone: "0599123456", username: "p482913" };
  const edit = { ...newParent, id: "sami", password: "" };

  it("updates the parent, their login and their children", async () => {
    const { deps, tables, calls } = setup({ parents: [existing] });

    expect(await updateParentWith(deps, SCHOOL, { ...edit, studentIds: ["omar"] })).toEqual({ ok: true });

    expect(tables.students.filter((s) => s.parentId === "sami").map((s) => s.id)).toEqual(["omar"]);
    expect(calls.map((call) => call.method)).toEqual(["updateUser"]);
  });

  it("changes the password in Clerk only, never in the database", async () => {
    const { deps, writes, calls } = setup({ parents: [existing] });

    await updateParentWith(deps, SCHOOL, { ...edit, password: "Np4vXr8kLm" });

    expect(calls[0].params).toMatchObject({ password: "Np4vXr8kLm" });
    expect(JSON.stringify(writes)).not.toContain("Np4vXr8kLm");
  });

  it("touches no login for a parent in another school", async () => {
    const { deps, calls } = setup({ parents: [{ ...existing, schoolId: OTHER_SCHOOL }] });

    expect(await updateParentWith(deps, SCHOOL, edit)).toEqual({ ok: false, problem: "parentNotFound" });
    expect(calls).toEqual([]);
  });

  it("refuses a child from another school", async () => {
    const { deps, calls } = setup({ parents: [existing] });

    expect(await updateParentWith(deps, SCHOOL, { ...edit, studentIds: ["elsewhere"] })).toEqual({
      ok: false,
      problem: "studentNotFound",
    });
    expect(calls).toEqual([]);
  });
});
