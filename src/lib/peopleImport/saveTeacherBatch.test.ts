import { afterEach, describe, expect, it, vi } from "vitest";

import { fakeClerk, fakePeopleDb, type FakePeopleData, type FakeTeacher } from "@/lib/people/testing/fakePeopleDb";

import type { SaveRowInput } from "./saveBatch";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";
import { saveTeacherBatchWith, type TeacherSaveDeps } from "./saveTeacherBatch";

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
      { id: 1, schoolId: SCHOOL, name: "رياضيات", gradeId: 7 },
      { id: 2, schoolId: SCHOOL, name: "رياضيات", gradeId: 8 },
      { id: 3, schoolId: SCHOOL, name: "علوم", gradeId: 7 },
      { id: 4, schoolId: SCHOOL, name: "فن", gradeId: 9 },
      { id: 5, schoolId: OTHER_SCHOOL, name: "حاسوب", gradeId: 7 },
    ],
    ...data,
  });
  const accounts = fakeClerk();
  const emails: { to: string; username: string; password: string }[] = [];
  const mail = { failFor: new Set<string>() };
  const deps = {
    db: people.db,
    clerk: accounts.clerk,
    wait: async () => {},
    sendEmail: async (to: string, username: string, password: string) => {
      if (mail.failFor.has(to)) throw new Error("SMTP down");
      emails.push({ to, username, password });
    },
  } as unknown as TeacherSaveDeps;
  return { ...people, ...accounts, deps, emails, mail };
};

const existing = (fields: Partial<FakeTeacher> = {}): FakeTeacher => ({
  id: "omar",
  schoolId: SCHOOL,
  username: "t100001",
  name: "عمر صالح",
  email: "omar@school.ps",
  phone: "0599111111",
  sex: "MALE",
  birthday: new Date("1985-03-02"),
  bloodType: "A+",
  address: "نابلس",
  ...fields,
});

const sara = { teacherName: "سارة نصر", email: "sara@school.ps", phone: "0599222222", sex: "أنثى", birthday: "1990-05-20", bloodType: "O+", address: "رام الله" };
const huda = { teacherName: "هدى خليل", phone: "0599333333", sex: "أنثى" };
const row = (values: Record<string, string>, sourceRow: number, decision?: SaveRowInput["decision"]): SaveRowInput => ({
  sourceRow,
  values,
  ...(decision && { decision }),
});
const save = (deps: TeacherSaveDeps, rows: SaveRowInput[]) => saveTeacherBatchWith(deps, SCHOOL, rows);

afterEach(() => vi.restoreAllMocks());

describe("saving new teachers", () => {
  it("creates a teacher without subjects, with a login and no subjects or classes", async () => {
    const { deps, tables, users } = setup();

    const { results } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(results.map((r) => r.outcome)).toEqual(["created", "created"]);
    expect(tables.teachers).toHaveLength(2);
    expect(tables.teachers.find((t) => t.phone === "0599222222")).toMatchObject({
      schoolId: SCHOOL,
      name: "سارة نصر",
      email: "sara@school.ps",
      sex: "FEMALE",
      bloodType: "O+",
      subjectIds: [],
      classIds: [],
    });
    expect([...users.values()].map((user) => user.role)).toEqual(["teacher", "teacher"]);
  });

  it("returns each new login once, and never writes a password to the database", async () => {
    const { deps, writes, users } = setup();

    const { results } = await save(deps, [row(huda, 2)]);

    const [login] = results[0].logins;
    expect(login).toMatchObject({ role: "teacher", name: "هدى خليل", emailed: false });
    expect(login.username).toMatch(/^t\d{6}$/);
    expect(login.password).toHaveLength(12);
    expect(users.get("user_1")).toMatchObject({ username: login.username, password: login.password });
    expect(JSON.stringify(writes)).not.toContain(login.password);
  });

  it("saves the good rows and gives the bad ones their reasons", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [
      row(sara, 2),
      row({ teacherName: "بلا تواصل", sex: "ذكر" }, 3),
      row(huda, 4),
      row({ ...huda, phone: "0599444444", teacherName: "" }, 5),
    ]);

    expect(results.map((r) => [r.sourceRow, r.outcome, r.reasons])).toEqual([
      [2, "created", []],
      [3, "failed", ["noContact"]],
      [4, "created", []],
      [5, "failed", ["requiredMissing"]],
    ]);
    expect(tables.teachers).toHaveLength(2);
  });

  it("leaves skipped rows alone", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [row(sara, 2, { skip: true })]);

    expect(results[0]).toMatchObject({ outcome: "skipped", logins: [] });
    expect(tables.teachers).toEqual([]);
  });

  it("stops when the database fails, deletes that login, and keeps the row already saving", async () => {
    const { deps, users, tables } = setup();
    const db = deps.db as unknown as { teacher: { create: (args: { data: { phone: string } }) => Promise<unknown> } };
    const create = db.teacher.create;
    db.teacher.create = async (args) => {
      if (args.data.phone === "0599222222") throw new Error("database down");
      return create(args);
    };

    const { results, stopped } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(stopped).toBe("saveProblem");
    expect(results.map((r) => [r.sourceRow, r.outcome])).toEqual([[3, "created"]]);
    expect(users.size).toBe(1);
    expect(tables.teachers.map((t) => t.phone)).toEqual(["0599333333"]);
  });

  it("still fails only the row when Clerk refuses that person's data", async () => {
    const { deps, clerk, tables } = setup();
    const createUser = clerk.createUser;
    let calls = 0;
    clerk.createUser = async (params) => {
      if (calls++ === 0) throw Object.assign(new Error("Unprocessable"), { status: 422 });
      return createUser(params);
    };

    const { results, stopped } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(stopped).toBeUndefined();
    expect(results.map((r) => r.outcome).sort()).toEqual(["created", "failed"]);
    expect(results.find((r) => r.outcome === "failed")?.reasons).toEqual(["accountFailed"]);
    expect(tables.teachers).toHaveLength(1);
  });

  it("stops when Clerk won't make more accounts, and starts no new row after", async () => {
    const { deps, clerk, calls, tables } = setup();
    clerk.createUser = async (params) => {
      calls.push({ method: "createUser", params });
      throw Object.assign(new Error("Forbidden"), { status: 403, errors: [{ code: "user_quota_exceeded" }] });
    };
    const teachers = Array.from({ length: 6 }, (_, i) => row({ teacherName: `معلم ${i}`, phone: `059944444${i}`, sex: "ذكر" }, i + 2));

    const { results, stopped } = await save(deps, teachers);

    expect(stopped).toBe("accountLimit");
    expect(results).toEqual([]);
    // Only the rows already running tried Clerk: the last two never started.
    expect(calls.filter((call) => call.method === "createUser")).toHaveLength(4);
    expect(tables.teachers).toEqual([]);
  });

  it("stops when Clerk can't be reached", async () => {
    const { deps, fail } = setup();
    fail.create = true;

    const { results, stopped } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(stopped).toBe("accountService");
    expect(results).toEqual([]);
  });

  it("stops before saving anyone when usernames can't be checked", async () => {
    const { deps, clerk, calls } = setup();
    clerk.getUserList = async () => {
      throw Object.assign(new Error("Service Unavailable"), { status: 503 });
    };

    const { results, stopped } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(stopped).toBe("accountService");
    expect(results).toEqual([]);
    expect(calls.filter((call) => call.method === "createUser")).toEqual([]);
  });

  it("waits and tries again once when Clerk is busy", async () => {
    const { deps, fail, tables } = setup();
    fail.rateLimitOnce = true;

    const { results } = await save(deps, [row(huda, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(tables.teachers).toHaveLength(1);
  });

  it("saves at most four rows at the same time", async () => {
    const { deps, clerk, tables } = setup();
    const createUser = clerk.createUser;
    let running = 0;
    let most = 0;
    clerk.createUser = async (params) => {
      most = Math.max(most, ++running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return createUser(params);
    };
    const rows = Array.from({ length: SAVE_BATCH_SIZE }, (_, i) =>
      row({ teacherName: `معلم ${i}`, sex: "ذكر", phone: `05990000${String(i).padStart(2, "0")}` }, i + 2),
    );

    const { results } = await save(deps, rows);

    expect(results.every((r) => r.outcome === "created")).toBe(true);
    expect(tables.teachers).toHaveLength(SAVE_BATCH_SIZE);
    expect(most).toBeGreaterThan(1);
    expect(most).toBeLessThanOrEqual(4);
  });

  it("refuses more rows than one batch holds", async () => {
    const { deps } = setup();
    const rows = Array.from({ length: SAVE_BATCH_SIZE + 1 }, (_, i) => row(huda, i + 2));

    await expect(save(deps, rows)).rejects.toThrow();
  });
});

describe("staying inside the admin's school", () => {
  it("never matches or changes another school's teacher with the same email", async () => {
    const { deps, tables } = setup({ teachers: [existing({ schoolId: OTHER_SCHOOL })] });

    const { results } = await save(deps, [row({ teacherName: "عمر جديد", email: "omar@school.ps", sex: "ذكر" }, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(tables.teachers.find((t) => t.id === "omar")).toMatchObject({ schoolId: OTHER_SCHOOL, name: "عمر صالح" });
    expect(tables.teachers.find((t) => t.id !== "omar")).toMatchObject({ schoolId: SCHOOL, name: "عمر جديد" });
  });
});

describe("existing teachers", () => {
  it("adds nobody when the same rows are saved again", async () => {
    const { deps, tables, users } = setup();
    await save(deps, [row(sara, 2), row(huda, 3)]);

    const { results } = await save(deps, [row(sara, 2), row(huda, 3)]);

    expect(results.map((r) => r.outcome)).toEqual(["unchanged", "unchanged"]);
    expect(tables.teachers).toHaveLength(2);
    expect(users.size).toBe(2);
  });

  it("changes only the fields the admin accepted, and never erases from an empty cell", async () => {
    const { deps, tables } = setup({ teachers: [existing()] });

    const { results } = await save(deps, [
      row(
        { teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر", address: "جنين", bloodType: "B+" },
        2,
        { rejectedChanges: ["bloodType"] },
      ),
    ]);

    expect(results[0]).toMatchObject({ outcome: "updated", logins: [] });
    expect(tables.teachers[0]).toMatchObject({ address: "جنين", bloodType: "A+", phone: "0599111111", name: "عمر صالح" });
    expect(tables.teachers[0].birthday).toEqual(new Date("1985-03-02"));
  });

  it("never sets a password on an existing teacher's login", async () => {
    const { deps, calls } = setup({ teachers: [existing()] });

    await save(deps, [row({ teacherName: "عمر الصالح", email: "omar@school.ps", sex: "ذكر" }, 2)]);

    const update = calls.find((call) => call.method === "updateUser");
    expect(update?.params).toMatchObject({ firstName: "عمر الصالح", username: "t100001" });
    expect(update?.params).not.toHaveProperty("password");
    expect(calls.some((call) => call.method === "createUser")).toBe(false);
  });

  it("refuses a phone that belongs to another teacher", async () => {
    const { deps, tables } = setup({ teachers: [existing(), existing({ id: "sara", username: "t100002", email: null, phone: "0599222222" })] });

    const { results } = await save(deps, [row({ teacherName: "عمر صالح", email: "omar@school.ps", phone: "0599222222", sex: "ذكر" }, 2)]);

    expect(results[0]).toMatchObject({ outcome: "failed", reasons: ["contactTaken"] });
    expect(tables.teachers[0].phone).toBe("0599111111");
  });
});

describe("login emails", () => {
  it("emails the login to a teacher with an email, after saving", async () => {
    const { deps, emails } = setup();

    const { results } = await save(deps, [row(sara, 2)]);

    const [login] = results[0].logins;
    expect(login.emailed).toBe(true);
    expect(emails).toEqual([{ to: "sara@school.ps", username: login.username, password: login.password }]);
  });

  it("keeps the teacher and their login when the email fails, and logs neither the address nor the password", async () => {
    const { deps, mail, tables, users } = setup();
    mail.failFor.add("sara@school.ps");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const { results } = await save(deps, [row(sara, 2)]);

    expect(results[0].outcome).toBe("created");
    expect(results[0].logins[0].emailed).toBe(false);
    expect(tables.teachers).toHaveLength(1);
    expect(users.size).toBe(1);
    const text = JSON.stringify(logged.mock.calls);
    expect(text).not.toContain("sara@school.ps");
    expect(text).not.toContain(results[0].logins[0].password);
  });
});

describe("teachers with subjects", () => {
  it("links the subjects and the classes of their grades, next to a teacher without subjects", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [row({ ...sara, subjects: "رياضيات 7، رياضيات 8" }, 2), row(huda, 3)]);

    expect(results.map((r) => r.outcome)).toEqual(["created", "created"]);
    expect(tables.teachers.find((t) => t.phone === "0599222222")).toMatchObject({ subjectIds: [1, 2], classIds: [71, 72, 81] });
    expect(tables.teachers.find((t) => t.phone === "0599333333")).toMatchObject({ subjectIds: [], classIds: [] });
  });

  it("doesn't save a row with an unknown subject, and saves it once the admin picks or removes it", async () => {
    const { deps, tables } = setup();

    const first = await save(deps, [row({ ...sara, subjects: "رياضيات، كيمياء" }, 2)]);
    expect(first.results[0]).toMatchObject({ outcome: "failed", reasons: ["unknownSubject"] });
    expect(tables.teachers).toEqual([]);

    const second = await save(deps, [row({ ...sara, subjects: "رياضيات، كيمياء" }, 2, { subjectChoices: { رياضيات: 2, كيمياء: null } })]);
    expect(second.results[0].outcome).toBe("created");
    expect(tables.teachers[0]).toMatchObject({ subjectIds: [2], classIds: [81] });
  });

  it("never links another school's subject, by name or by the admin's pick", async () => {
    const { deps, tables } = setup();

    const { results } = await save(deps, [
      row({ ...sara, subjects: "حاسوب" }, 2),
      row({ ...huda, subjects: "حاسوب" }, 3, { subjectChoices: { حاسوب: 5 } }),
    ]);

    expect(results.map((r) => [r.outcome, r.reasons])).toEqual([
      ["failed", ["unknownSubject"]],
      ["failed", ["unknownSubject"]],
    ]);
    expect(tables.teachers).toEqual([]);
  });

  it("fails a row whose subject's grade has no classes", async () => {
    const { deps, tables, users } = setup();

    const { results } = await save(deps, [row({ ...sara, subjects: "فن" }, 2)]);

    expect(results[0]).toMatchObject({ outcome: "failed", reasons: ["subjectWithoutClasses"] });
    expect(tables.teachers).toEqual([]);
    expect(users.size).toBe(0);
  });

  it("adds the file's subjects to an existing teacher and removes none", async () => {
    const { deps, tables } = setup({ teachers: [existing({ subjectIds: [2], classIds: [81] })] });

    const { results } = await save(deps, [row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر", subjects: "علوم" }, 2)]);

    expect(results[0].outcome).toBe("updated");
    expect(tables.teachers[0].subjectIds).toEqual([2, 3]);
    expect(tables.teachers[0].classIds).toEqual([81, 71, 72]);
  });

  it("adds nothing when the same subjects are saved again", async () => {
    const { deps, tables } = setup();
    await save(deps, [row({ ...sara, subjects: "علوم" }, 2)]);

    const { results } = await save(deps, [row({ ...sara, subjects: "علوم" }, 2)]);

    expect(results[0].outcome).toBe("unchanged");
    expect(tables.teachers).toHaveLength(1);
    expect(tables.teachers[0].subjectIds).toEqual([3]);
  });
});
