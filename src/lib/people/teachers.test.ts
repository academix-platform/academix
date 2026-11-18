import { describe, expect, it } from "vitest";

import { changeTeacherWith, createTeacherWith, updateTeacherWith, type TeacherDeps } from "./teachers";
import { fakeClerk, fakePeopleDb, type FakePeopleData } from "./testing/fakePeopleDb";

const SCHOOL = 1;
const OTHER_SCHOOL = 2;

const setup = (data: FakePeopleData = {}) => {
  const people = fakePeopleDb({
    classes: [
      { id: 71, schoolId: SCHOOL, gradeId: 7, capacity: 30 },
      { id: 72, schoolId: SCHOOL, gradeId: 7, capacity: 30 },
      { id: 81, schoolId: SCHOOL, gradeId: 8, capacity: 30 },
      { id: 91, schoolId: OTHER_SCHOOL, gradeId: 7, capacity: 30 },
    ],
    subjects: [
      { id: 1, schoolId: SCHOOL, name: "Math", gradeId: 7 },
      { id: 2, schoolId: SCHOOL, name: "Math", gradeId: 8 },
      { id: 3, schoolId: SCHOOL, name: "Art", gradeId: 9 },
      { id: 4, schoolId: OTHER_SCHOOL, name: "Math", gradeId: 7 },
    ],
    ...data,
  });
  const accounts = fakeClerk();
  const deps = { db: people.db, clerk: accounts.clerk } as unknown as TeacherDeps;
  return { ...people, ...accounts, deps };
};

const newTeacher = {
  username: "t482913",
  password: "Kp7mWq3xRt",
  name: "Omar Saleh",
  email: "omar@example.com",
  phone: "0599111222",
  sex: "MALE" as const,
  subjectIds: [1],
};

const omar = {
  id: "omar",
  schoolId: SCHOOL,
  username: "t100001",
  name: "Omar Saleh",
  email: "omar@example.com",
  phone: "0599111222",
  sex: "MALE",
  subjectIds: [1],
  classIds: [71, 72],
};

describe("createTeacherWith", () => {
  it("creates the login and the teacher with their subjects and those grades' classes", async () => {
    const { deps, tables, users } = setup();

    const created = await createTeacherWith(deps, SCHOOL, { ...newTeacher, subjectIds: [1, 2] });

    expect(created).toEqual({ ok: true, id: "user_1" });
    expect(users.get("user_1")).toMatchObject({ username: "t482913", role: "teacher" });
    expect(tables.teachers).toEqual([
      expect.objectContaining({ id: "user_1", schoolId: SCHOOL, subjectIds: [1, 2], classIds: [71, 72, 81] }),
    ]);
  });

  it("never sends the password to the database", async () => {
    const { deps, writes } = setup();

    await createTeacherWith(deps, SCHOOL, newTeacher);

    expect(JSON.stringify(writes)).not.toContain(newTeacher.password);
  });

  it("refuses a teacher without subjects, as the manual form requires one", async () => {
    const { deps, tables, users } = setup();

    const created = await createTeacherWith(deps, SCHOOL, { ...newTeacher, subjectIds: [] });

    expect(created).toEqual({ ok: false, problem: "noSubjects" });
    expect(tables.teachers).toEqual([]);
    expect(users.size).toBe(0);
  });

  it("creates an imported teacher without subjects, with no subjects or classes", async () => {
    const { deps, tables } = setup();

    const created = await createTeacherWith(deps, SCHOOL, { ...newTeacher, subjectIds: [] }, { allowNoSubjects: true });

    expect(created).toEqual({ ok: true, id: "user_1" });
    expect(tables.teachers[0]).toMatchObject({ subjectIds: [], classIds: [] });
  });

  it("refuses another school's subject before creating a login", async () => {
    const { deps, tables, users } = setup();

    const created = await createTeacherWith(deps, SCHOOL, { ...newTeacher, subjectIds: [1, 4] });

    expect(created).toEqual({ ok: false, problem: "subjectNotFound" });
    expect(tables.teachers).toEqual([]);
    expect(users.size).toBe(0);
  });

  it("refuses subjects whose grades have no classes", async () => {
    const { deps, users } = setup();

    const created = await createTeacherWith(deps, SCHOOL, { ...newTeacher, subjectIds: [3] }, { allowNoSubjects: true });

    expect(created).toEqual({ ok: false, problem: "noClasses" });
    expect(users.size).toBe(0);
  });

  it("never links another school's classes of the same grade", async () => {
    const { deps, tables } = setup();

    await createTeacherWith(deps, SCHOOL, newTeacher);

    expect(tables.teachers[0].classIds).toEqual([71, 72]);
  });

  it("deletes the new login when the teacher can't be saved", async () => {
    const { deps, failures, tables, users, calls } = setup();
    failures.teacherCreate = true;

    await expect(createTeacherWith(deps, SCHOOL, newTeacher)).rejects.toThrow("teacher create failed");

    expect(tables.teachers).toEqual([]);
    expect(users.size).toBe(0);
    expect(calls.map((call) => call.method)).toEqual(["createUser", "deleteUser"]);
  });

  it("saves empty optional fields as empty values", async () => {
    const { deps, tables } = setup();

    await createTeacherWith(deps, SCHOOL, { ...newTeacher, email: "", phone: "", address: "", bloodType: "" });

    expect(tables.teachers[0]).toMatchObject({ email: null, phone: null, address: null, bloodType: null, birthday: null });
  });
});

describe("updateTeacherWith", () => {
  it("updates the teacher and replaces their subjects and classes", async () => {
    const { deps, tables } = setup({ teachers: [omar] });

    const updated = await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", username: "t100001", name: "Omar S.", subjectIds: [2] });

    expect(updated).toEqual({ ok: true });
    expect(tables.teachers[0]).toMatchObject({ name: "Omar S.", subjectIds: [2], classIds: [81] });
  });

  it("never writes a password to the database, and sends a new one to Clerk only", async () => {
    const { deps, writes, calls } = setup({ teachers: [omar] });

    await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", password: "NewPass7xQ" });

    expect(JSON.stringify(writes)).not.toContain("NewPass7xQ");
    expect(writes.every((write) => !("password" in write))).toBe(true);
    expect(calls.find((call) => call.method === "updateUser")?.params).toMatchObject({ password: "NewPass7xQ" });
  });

  it("keeps the current password when it is left blank", async () => {
    const { deps, calls } = setup({ teachers: [omar] });

    await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", password: "" });

    expect(calls.find((call) => call.method === "updateUser")?.params).not.toHaveProperty("password");
  });

  it("refuses another school's teacher before touching the login", async () => {
    const { deps, tables, calls } = setup({ teachers: [{ ...omar, schoolId: OTHER_SCHOOL }] });

    const updated = await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", name: "Changed" });

    expect(updated).toEqual({ ok: false, problem: "teacherNotFound" });
    expect(tables.teachers[0].name).toBe("Omar Saleh");
    expect(calls).toEqual([]);
  });

  it("still requires a subject", async () => {
    const { deps, calls } = setup({ teachers: [omar] });

    const updated = await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", subjectIds: [] });

    expect(updated).toEqual({ ok: false, problem: "noSubjects" });
    expect(calls).toEqual([]);
  });

  it("refuses another school's subject before touching the login", async () => {
    const { deps, calls } = setup({ teachers: [omar] });

    const updated = await updateTeacherWith(deps, SCHOOL, { ...newTeacher, id: "omar", subjectIds: [4] });

    expect(updated).toEqual({ ok: false, problem: "subjectNotFound" });
    expect(calls).toEqual([]);
  });
});

describe("changeTeacherWith", () => {
  it("changes only the fields given and leaves the rest", async () => {
    const { deps, tables } = setup({ teachers: [{ ...omar, address: "Nablus" }] });

    const changed = await changeTeacherWith(deps, SCHOOL, "omar", { fields: { phone: "0599333444" } });

    expect(changed).toEqual({ ok: true });
    expect(tables.teachers[0]).toMatchObject({ phone: "0599333444", email: "omar@example.com", address: "Nablus", name: "Omar Saleh" });
  });

  it("adds subjects and their classes, and removes none", async () => {
    const { deps, tables } = setup({ teachers: [omar] });

    await changeTeacherWith(deps, SCHOOL, "omar", { addSubjectIds: [2] });

    expect(tables.teachers[0].subjectIds).toEqual([1, 2]);
    expect(tables.teachers[0].classIds).toEqual([71, 72, 81]);
  });

  it("renames the login only when the name changes, and never sets a password", async () => {
    const { deps, calls } = setup({ teachers: [omar] });

    await changeTeacherWith(deps, SCHOOL, "omar", { fields: { phone: "0599333444" } });
    expect(calls).toEqual([]);

    await changeTeacherWith(deps, SCHOOL, "omar", { fields: { name: "Omar Salih" } });
    expect(calls).toEqual([
      { method: "updateUser", userId: "omar", params: { username: "t100001", firstName: "Omar Salih", publicMetadata: { role: "teacher" } } },
    ]);
  });

  it("refuses another school's teacher", async () => {
    const { deps, tables, calls } = setup({ teachers: [{ ...omar, schoolId: OTHER_SCHOOL }] });

    const changed = await changeTeacherWith(deps, SCHOOL, "omar", { fields: { name: "Changed" }, addSubjectIds: [1] });

    expect(changed).toEqual({ ok: false, problem: "teacherNotFound" });
    expect(tables.teachers[0].name).toBe("Omar Saleh");
    expect(calls).toEqual([]);
  });

  it("refuses another school's subject, and a subject whose grade has no classes", async () => {
    const { deps, tables } = setup({ teachers: [omar] });

    expect(await changeTeacherWith(deps, SCHOOL, "omar", { addSubjectIds: [4] })).toEqual({ ok: false, problem: "subjectNotFound" });
    expect(await changeTeacherWith(deps, SCHOOL, "omar", { addSubjectIds: [3] })).toEqual({ ok: false, problem: "noClasses" });
    expect(tables.teachers[0].subjectIds).toEqual([1]);
  });
});
