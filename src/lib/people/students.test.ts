import { describe, expect, it } from "vitest";

import { createStudentWith, updateStudentWith, type StudentDeps } from "./students";
import { fakeClerk, fakePeopleDb, type FakePeopleData } from "./testing/fakePeopleDb";

const SCHOOL = 1;
const OTHER_SCHOOL = 2;

const setup = (data: FakePeopleData = {}) => {
  const people = fakePeopleDb({
    classes: [
      { id: 10, schoolId: SCHOOL, gradeId: 7, capacity: 2 },
      { id: 20, schoolId: OTHER_SCHOOL, gradeId: 7, capacity: 30 },
    ],
    parents: [
      { id: "parent_mine", schoolId: SCHOOL, phone: "0599000001" },
      { id: "parent_other", schoolId: OTHER_SCHOOL, phone: "0599000002" },
    ],
    ...data,
  });
  const accounts = fakeClerk();
  const deps = {
    db: people.db,
    clerk: accounts.clerk,
    academicYearId: async () => 7,
  } as unknown as StudentDeps;
  return { ...people, ...accounts, deps };
};

const newStudent = {
  username: "s482913",
  password: "Kp7mWq3xRt",
  name: "Lina Haddad",
  nationalId: "123456782",
  sex: "FEMALE" as const,
  gradeId: 7,
  classId: 10,
};

describe("createStudentWith", () => {
  it("creates the login, the student and their enrollment in the current year", async () => {
    const { deps, tables, users } = setup();

    const created = await createStudentWith(deps, SCHOOL, newStudent);

    expect(created).toEqual({ ok: true, id: "user_1", nationalId: "123456782" });
    expect(users.get("user_1")).toMatchObject({ username: "s482913", role: "student" });
    expect(tables.students).toEqual([
      expect.objectContaining({ id: "user_1", schoolId: SCHOOL, classId: 10, gradeId: 7, nationalId: "123456782" }),
    ]);
    expect(tables.enrollments).toEqual([
      expect.objectContaining({ studentId: "user_1", academicYearId: 7, classId: 10, gradeId: 7 }),
    ]);
  });

  it("saves empty optional fields as empty values", async () => {
    const { deps, tables } = setup();

    await createStudentWith(deps, SCHOOL, { ...newStudent, address: "", bloodType: "", email: "" });

    expect(tables.students[0]).toMatchObject({ address: null, bloodType: null, birthday: null, email: null });
  });

  it("never writes the password to the database", async () => {
    const { deps, writes } = setup();

    await createStudentWith(deps, SCHOOL, newStudent);

    expect(JSON.stringify(writes)).not.toContain("Kp7mWq3xRt");
    expect(writes.every((row) => !("password" in row))).toBe(true);
  });

  it("creates nothing for a class in another school", async () => {
    const { deps, tables, calls } = setup();

    expect(await createStudentWith(deps, SCHOOL, { ...newStudent, classId: 20 })).toEqual({
      ok: false,
      problem: "classNotFound",
    });
    expect(calls).toEqual([]);
    expect(tables.students).toEqual([]);
  });

  it("creates nothing when the class is full", async () => {
    const { deps, calls } = setup({
      students: [
        { id: "a", schoolId: SCHOOL, classId: 10 },
        { id: "b", schoolId: SCHOOL, classId: 10 },
      ],
    });

    expect(await createStudentWith(deps, SCHOOL, newStudent)).toEqual({ ok: false, problem: "classFull" });
    expect(calls).toEqual([]);
  });

  it("creates nothing when the parent is in another school", async () => {
    const { deps, calls } = setup();

    expect(await createStudentWith(deps, SCHOOL, { ...newStudent, parentId: "parent_other" })).toEqual({
      ok: false,
      problem: "parentNotFound",
    });
    expect(calls).toEqual([]);
  });

  it("links a parent from the same school", async () => {
    const { deps, tables } = setup();

    await createStudentWith(deps, SCHOOL, { ...newStudent, parentId: "parent_mine" });

    expect(tables.students[0]).toMatchObject({ parentId: "parent_mine" });
  });

  it("creates nothing when the national ID is already used in the school", async () => {
    const { deps, calls } = setup({
      students: [{ id: "lina_old", schoolId: SCHOOL, classId: 10, nationalId: "123456782" }],
    });

    expect(await createStudentWith(deps, SCHOOL, newStudent)).toEqual({ ok: false, problem: "nationalIdTaken" });
    expect(calls).toEqual([]);
  });

  it("deletes the new login and keeps nothing when the enrollment can't be saved", async () => {
    const { deps, tables, failures, users, calls } = setup();
    failures.enrollmentCreate = true;

    await expect(createStudentWith(deps, SCHOOL, newStudent)).rejects.toThrow("enrollment create failed");

    expect(tables.students).toEqual([]);
    expect(tables.enrollments).toEqual([]);
    expect(users.size).toBe(0);
    expect(calls.map((call) => call.method)).toEqual(["createUser", "deleteUser"]);
  });

  it("creates no login when there is no current academic year", async () => {
    const { deps, calls } = setup();
    const noYear = { ...deps, academicYearId: async () => Promise.reject(new Error("No current academic year found.")) };

    await expect(createStudentWith(noYear, SCHOOL, newStudent)).rejects.toThrow("No current academic year");
    expect(calls).toEqual([]);
  });
});

describe("updateStudentWith", () => {
  const existing = { id: "lina", schoolId: SCHOOL, classId: 10, gradeId: 7, username: "s482913", nationalId: null };
  const edit = { ...newStudent, id: "lina", password: "" };

  it("updates the student and their login", async () => {
    const { deps, tables, calls } = setup({ students: [existing] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, name: "Lina H." })).toEqual({ ok: true });

    expect(tables.students[0]).toMatchObject({ name: "Lina H.", nationalId: "123456782" });
    expect(calls).toEqual([
      { method: "updateUser", userId: "lina", params: expect.not.objectContaining({ password: expect.anything() }) },
    ]);
  });

  it("changes the password in Clerk only, never in the database", async () => {
    const { deps, writes, calls } = setup({ students: [existing] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, password: "Np4vXr8kLm" })).toEqual({ ok: true });

    expect(calls[0].params).toMatchObject({ password: "Np4vXr8kLm" });
    expect(JSON.stringify(writes)).not.toContain("Np4vXr8kLm");
  });

  it("touches no login for a student in another school", async () => {
    const { deps, calls, tables } = setup({ students: [{ ...existing, schoolId: OTHER_SCHOOL }] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, password: "Np4vXr8kLm" })).toEqual({
      ok: false,
      problem: "studentNotFound",
    });
    expect(calls).toEqual([]);
    expect(tables.students[0]).toMatchObject({ nationalId: null });
  });

  it("refuses a parent from another school", async () => {
    const { deps, calls } = setup({ students: [existing] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, parentId: "parent_other" })).toEqual({
      ok: false,
      problem: "parentNotFound",
    });
    expect(calls).toEqual([]);
  });

  it("refuses to move the student into another school's class", async () => {
    const { deps, calls, tables } = setup({ students: [existing] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, classId: 20 })).toEqual({
      ok: false,
      problem: "classNotFound",
    });
    expect(calls).toEqual([]);
    expect(tables.students[0]).toMatchObject({ classId: 10 });
  });

  it("asks for a national ID when an old student without one is edited", async () => {
    const { deps, calls } = setup({ students: [existing] });

    expect(await updateStudentWith(deps, SCHOOL, { ...edit, nationalId: "" })).toEqual({
      ok: false,
      problem: "nationalIdRequired",
    });
    expect(calls).toEqual([]);
  });
});
