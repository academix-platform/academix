import { afterEach, describe, expect, it, vi } from "vitest";

import { fakeClerk, fakePeopleDb, type FakePeopleData, type FakeStudent } from "@/lib/people/testing/fakePeopleDb";

import { SAVE_BATCH_SIZE, saveStudentBatchWith, type SaveDeps, type SaveRowInput } from "./saveBatch";

const SCHOOL = 1;
const OTHER_SCHOOL = 2;

const setup = (data: FakePeopleData = {}) => {
  const people = fakePeopleDb({
    classes: [
      { id: 1, schoolId: SCHOOL, name: "السابع أ", gradeId: 7, capacity: 30 },
      { id: 2, schoolId: SCHOOL, name: "السابع ب", gradeId: 7, capacity: 30 },
      { id: 3, schoolId: SCHOOL, name: "صغير", gradeId: 7, capacity: 1 },
      { id: 9, schoolId: OTHER_SCHOOL, name: "التاسع أ", gradeId: 9, capacity: 30 },
    ],
    ...data,
  });
  const accounts = fakeClerk();
  const emails: { to: string; username: string; password: string }[] = [];
  const mail = { failFor: new Set<string>() };
  const deps = {
    db: people.db,
    clerk: accounts.clerk,
    academicYearId: async () => 7,
    wait: async () => {},
    sendEmail: async (to: string, username: string, password: string) => {
      if (mail.failFor.has(to)) throw new Error("SMTP down");
      emails.push({ to, username, password });
    },
  } as unknown as SaveDeps;
  return { ...people, ...accounts, deps, emails, mail };
};

const existing = (fields: Partial<FakeStudent>): FakeStudent => ({
  id: "lina",
  schoolId: SCHOOL,
  username: "s100001",
  name: "ليلى حداد",
  nationalId: "123456782",
  classId: 2,
  gradeId: 7,
  sex: "FEMALE",
  birthday: new Date("2013-09-14"),
  bloodType: "O+",
  address: "رام الله",
  phone: null,
  email: null,
  parentId: null,
  ...fields,
});

const lina = { studentName: "ليلى حداد", nationalId: "123456782", className: "السابع ب", sex: "أنثى", birthday: "2013-09-14", bloodType: "O+", address: "رام الله" };
const yousef = { studentName: "يوسف عودة", nationalId: "000000018", className: "السابع أ", sex: "ذكر" };
const omar = { studentName: "عمر صالح", nationalId: "023456783", className: "السابع أ", sex: "ذكر" };
const row = (values: Record<string, string>, sourceRow: number, decision?: SaveRowInput["decision"]): SaveRowInput => ({
  sourceRow,
  values,
  ...(decision && { decision }),
});

const save = (deps: SaveDeps, rows: SaveRowInput[]) => saveStudentBatchWith(deps, SCHOOL, rows);

describe("saving new students", () => {
  it("creates each student with a login, enrolled in the current year", async () => {
    const { deps, tables, users } = setup();

    const { results } = await save(deps, [row(lina, 2), row(yousef, 3)]);

    expect(results.map((r) => r.outcome)).toEqual(["created", "created"]);
    expect(tables.students.map((s) => s.nationalId)).toEqual(["123456782", "000000018"]);
    expect(tables.students[0]).toMatchObject({ schoolId: SCHOOL, classId: 2, gradeId: 7, sex: "FEMALE", bloodType: "O+" });
    expect(tables.enrollments).toHaveLength(2);
    expect(users.size).toBe(2);
  });

  it("returns each new login once, and never writes a password to the database", async () => {
    const { deps, writes, users } = setup();

    const { results } = await save(deps, [row(lina, 2)]);

    const [login] = results[0].logins;
    expect(login).toMatchObject({ role: "student", name: "ليلى حداد" });
    expect(login.username).toMatch(/^s\d{6}$/);
    expect(login.password).toHaveLength(12);
    expect(users.get("user_1")).toMatchObject({ username: login.username, password: login.password });
    expect(JSON.stringify(writes)).not.toContain(login.password);
  });

  it("saves the good rows and gives the bad ones their reasons", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [
      row(lina, 2),
      row({ ...yousef, nationalId: "000000019" }, 3),
      row(omar, 4),
      row({ ...omar, nationalId: "000000026", className: "الثامن ج" }, 5),
    ]);

    expect(results.map((r) => [r.sourceRow, r.outcome, r.reasons])).toEqual([
      [2, "created", []],
      [3, "failed", ["invalidNationalId"]],
      [4, "created", []],
      [5, "failed", ["unknownClass"]],
    ]);
    expect(tables.students).toHaveLength(2);
  });

  it("stops when the database fails, deletes that login, and keeps the row already saving", async () => {
    const { deps, failures, users, tables } = setup();
    let enrollments = 0;
    const db = deps.db as unknown as { studentAcademicYear: { create: (args: unknown) => Promise<unknown> } };
    const create = db.studentAcademicYear.create;
    db.studentAcademicYear.create = async (args) => {
      failures.enrollmentCreate = enrollments++ === 0;
      return create(args);
    };

    const { results, stopped } = await save(deps, [row(lina, 2), row(yousef, 3)]);

    expect(stopped).toBe("saveProblem");
    // Row 2 wasn't saved, so it is left out to be saved again. Row 3 was already saving.
    expect(results.map((r) => [r.sourceRow, r.outcome])).toEqual([[3, "created"]]);
    expect(users.size).toBe(1);
    expect(tables.students.map((s) => s.nationalId)).toEqual(["000000018"]);
  });

  it("stops when Clerk won't make more accounts, and saves nobody half-way", async () => {
    const { deps, clerk, tables } = setup();
    clerk.createUser = async () => {
      throw Object.assign(new Error("Forbidden"), { status: 403, errors: [{ code: "user_quota_exceeded" }] });
    };

    const { results, stopped } = await save(deps, [row(lina, 2), row(yousef, 3)]);

    expect(stopped).toBe("accountLimit");
    expect(results).toEqual([]);
    expect(tables.students).toEqual([]);
  });

  it("still fails only the row when Clerk refuses that person's data", async () => {
    const { deps, clerk, tables } = setup();
    const createUser = clerk.createUser;
    let calls = 0;
    clerk.createUser = async (params) => {
      if (calls++ === 0) throw Object.assign(new Error("Unprocessable"), { status: 422 });
      return createUser(params);
    };

    const { results, stopped } = await save(deps, [row(lina, 2), row(yousef, 3)]);

    expect(stopped).toBeUndefined();
    expect(results.map((r) => r.outcome).sort()).toEqual(["created", "failed"]);
    expect(results.find((r) => r.outcome === "failed")?.reasons).toEqual(["accountFailed"]);
    expect(tables.students).toHaveLength(1);
  });

  it("stops at a full class", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [row({ ...yousef, className: "صغير" }, 2), row({ ...omar, className: "صغير" }, 3)]);

    expect(results.map((r) => [r.outcome, r.reasons])).toEqual([
      ["created", []],
      ["failed", ["classFull"]],
    ]);
    expect(tables.students).toHaveLength(1);
  });

  it("waits and tries again once when Clerk is busy", async () => {
    const { deps, fail, tables } = setup();
    fail.rateLimitOnce = true;

    const { results } = await save(deps, [row(lina, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(tables.students).toHaveLength(1);
  });

  it("refuses more rows than one batch holds", async () => {
    const { deps } = setup();
    const rows = Array.from({ length: SAVE_BATCH_SIZE + 1 }, (_, i) => row(yousef, i + 2));

    await expect(save(deps, rows)).rejects.toThrow("batch");
  });
});

describe("staying inside the admin's school", () => {
  it("never touches another school's student with the same national ID", async () => {
    const { deps, tables } = setup({ students: [existing({ id: "theirs", schoolId: OTHER_SCHOOL, classId: 9 })] });

    const { results } = await save(deps, [row(lina, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(tables.students.find((s) => s.id === "theirs")).toMatchObject({ schoolId: OTHER_SCHOOL, classId: 9 });
    expect(tables.students.filter((s) => s.schoolId === SCHOOL)).toHaveLength(1);
  });

  it("can't put a student in another school's class", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [row({ ...yousef, className: "التاسع أ" }, 2)]);
    const picked = await save(deps, [row({ ...yousef, className: "التاسع أ" }, 2, { classId: 9 })]);

    expect(results[0].reasons).toEqual(["unknownClass"]);
    expect(picked.results[0].reasons).toEqual(["unknownClass"]);
    expect(tables.students).toEqual([]);
  });
});

describe("existing students", () => {
  it("adds nobody when the same rows are saved again", async () => {
    const { deps, tables, users } = setup();
    await save(deps, [row(lina, 2), row(yousef, 3)]);

    const again = await save(deps, [row(lina, 2), row(yousef, 3)]);

    expect(again.results.map((r) => r.outcome)).toEqual(["unchanged", "unchanged"]);
    expect(tables.students).toHaveLength(2);
    expect(users.size).toBe(2);
  });

  it("changes only the fields the admin accepted, and never erases from an empty cell", async () => {
    const { deps, tables } = setup({ students: [existing({})] });

    const { results } = await save(deps, [
      row(
        { studentName: "ليلى حداد", nationalId: "123456782", className: "السابع أ", sex: "أنثى", address: "نابلس", bloodType: "" },
        2,
        { rejectedChanges: ["address"] },
      ),
    ]);

    expect(results[0].outcome).toBe("updated");
    expect(tables.students[0]).toMatchObject({ classId: 1, address: "رام الله", bloodType: "O+", birthday: new Date("2013-09-14") });
  });

  it("asks before matching an old student without an ID, and adds the ID when told to", async () => {
    const old = existing({ id: "old", nationalId: null });
    const { deps, tables } = setup({ students: [old] });

    const unsure = await save(deps, [row(lina, 2)]);
    const same = await save(deps, [row(lina, 2, { sameAs: "old" })]);

    expect(unsure.results[0]).toMatchObject({ outcome: "failed", reasons: ["maybeSameStudent"] });
    expect(same.results[0].outcome).toBe("updated");
    expect(tables.students).toEqual([expect.objectContaining({ id: "old", nationalId: "123456782" })]);
  });

  it("won't move an existing student into a full class", async () => {
    const { deps, tables } = setup({ students: [existing({}), existing({ id: "x", nationalId: "000000026", classId: 3 })] });

    const { results } = await save(deps, [row({ ...lina, className: "صغير" }, 2)]);

    expect(results[0]).toMatchObject({ outcome: "failed", reasons: ["classFull"] });
    expect(tables.students[0]).toMatchObject({ classId: 2 });
  });
});

describe("parents", () => {
  const withParent = (values: Record<string, string>) => ({ ...values, parentName: "خالد عودة", parentPhone: "0597777777" });

  it("links two students with the same parent phone to one new parent", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [row(withParent(yousef), 2), row(withParent(omar), 3)]);

    expect(tables.parents).toHaveLength(1);
    const [parent] = tables.parents;
    expect(tables.students.map((s) => s.parentId)).toEqual([parent.id, parent.id]);
    expect(results[0].logins.map((login) => login.role)).toEqual(["student", "parent"]);
    expect(results[1].logins.map((login) => login.role)).toEqual(["student"]);
  });

  it("finds the parent saved by an earlier batch", async () => {
    const { deps, tables } = setup();

    await save(deps, [row(withParent(yousef), 2)]);
    await save(deps, [row(withParent(omar), 3)]);

    expect(tables.parents).toHaveLength(1);
    expect(new Set(tables.students.map((s) => s.parentId)).size).toBe(1);
  });

  it("links an existing parent with the same phone", async () => {
    const { deps, tables, users } = setup({
      parents: [{ id: "sami", schoolId: SCHOOL, phone: "0597777777", name: "خالد عودة", username: "p100001" }],
    });

    await save(deps, [row(withParent(yousef), 2)]);

    expect(tables.students[0].parentId).toBe("sami");
    expect(users.size).toBe(1);
  });

  it("keeps the saved student when only the parent fails, so the row can be saved again", async () => {
    const { deps, failures, tables } = setup();
    failures.parentCreate = true;

    const first = await save(deps, [row(withParent(yousef), 2)]);
    failures.parentCreate = false;
    const again = await save(deps, [row(withParent(yousef), 2)]);

    expect(first.results[0]).toMatchObject({ outcome: "failed", reasons: ["parentFailed"] });
    expect(first.results[0].logins.map((login) => login.role)).toEqual(["student"]);
    expect(again.results[0].outcome).toBe("updated");
    expect(tables.students).toHaveLength(1);
    expect(tables.students[0].parentId).toBe(tables.parents[0].id);
  });
});

afterEach(() => vi.restoreAllMocks());

describe("login emails", () => {
  it("emails the login to a student or parent with an email", async () => {
    const { deps, emails } = setup();

    const { results } = await save(deps, [
      row({ ...yousef, studentEmail: "yousef@example.com", parentName: "خالد عودة", parentPhone: "0597777777", parentEmail: "khaled@example.com" }, 2),
    ]);

    const [student, parent] = results[0].logins;
    expect(emails).toEqual([
      { to: "yousef@example.com", username: student.username, password: student.password },
      { to: "khaled@example.com", username: parent.username, password: parent.password },
    ]);
    expect(results[0].logins.map((login) => login.emailed)).toEqual([true, true]);
  });

  it("marks logins without an email as not emailed, for the admin to hand out", async () => {
    const { deps, emails } = setup();

    const { results } = await save(deps, [row(yousef, 2)]);

    expect(emails).toEqual([]);
    expect(results[0].logins[0].emailed).toBe(false);
  });

  it("keeps the person when the email fails, and logs neither the address nor the password", async () => {
    const { deps, mail, tables } = setup();
    mail.failFor.add("yousef@example.com");
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );

    const { results } = await save(deps, [row({ ...yousef, studentEmail: "yousef@example.com" }, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(results[0].logins[0].emailed).toBe(false);
    expect(tables.students).toHaveLength(1);
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain("yousef@example.com");
    expect(logged).not.toContain(results[0].logins[0].password);
  });
});
