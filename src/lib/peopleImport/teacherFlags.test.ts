import { describe, expect, it } from "vitest";

import type { ExistingTeacher } from "./matching";
import { reviewTeacherRows, type TeacherContext, type TeacherRowFlag } from "./teacherFlags";

const teacher = (fields: Partial<ExistingTeacher>): ExistingTeacher => ({
  id: "t1",
  name: "عمر صالح",
  email: "omar@school.ps",
  phone: "0599111111",
  sex: "MALE",
  birthday: new Date("1985-03-02"),
  bloodType: "A+",
  address: "نابلس",
  subjectIds: [],
  ...fields,
});
const subjects = [
  { id: 1, name: "رياضيات", gradeId: 70, level: 7 },
  { id: 2, name: "رياضيات", gradeId: 80, level: 8 },
  { id: 3, name: "علوم", gradeId: 70, level: 7 },
  { id: 4, name: "فن", gradeId: 90, level: 9 },
];
const context = (teachers: ExistingTeacher[] = []): TeacherContext => ({ teachers, subjects, gradesWithClasses: [70, 80] });

const full = {
  teacherName: "سارة نصر",
  email: "sara@school.ps",
  phone: "0599222222",
  sex: "أنثى",
  birthday: "1990-05-20",
  bloodType: "O+",
  address: "رام الله",
};
const row = (values: Record<string, string>, sourceRow = 2, unclear?: string[]) =>
  ({ sourceRow, values, ...(unclear && { unclear }) }) as Parameters<typeof reviewTeacherRows>[0][number];
const review = (rows: ReturnType<typeof row>[], teachers: ExistingTeacher[] = [], decisions = {}) =>
  reviewTeacherRows(rows, context(teachers), decisions);
const kinds = (flags: TeacherRowFlag[]) => flags.map((flag) => flag.kind);

describe("reviewTeacherRows", () => {
  it("reads a complete new teacher with no flags", () => {
    const [result] = review([row(full)]);

    expect(result).toMatchObject({ status: "new", flags: [], canSave: true });
    expect(result.teacher).toMatchObject({
      name: "سارة نصر",
      email: "sara@school.ps",
      phone: "0599222222",
      sex: "FEMALE",
      birthday: new Date("1990-05-20"),
      bloodType: "O+",
    });
  });

  it("flags a missing name or sex and blocks the row", () => {
    const [result] = review([row({ email: "sara@school.ps" })]);

    expect(result.flags[0]).toEqual({ kind: "requiredMissing", fields: ["teacherName", "sex"] });
    expect(result.canSave).toBe(false);
  });

  it("blocks a teacher with no email and no phone, who could never be found again", () => {
    const [result] = review([row({ teacherName: "سارة نصر", sex: "أنثى", bloodType: "O+", address: "x", birthday: "1990-05-20" })]);

    expect(kinds(result.flags)).toEqual(["noContact"]);
    expect(result.canSave).toBe(false);
  });

  it("accepts a teacher with only an email, or only a phone", () => {
    const { phone: _phone, ...emailOnly } = full;
    const { email: _email, ...phoneOnly } = full;

    expect(review([row(emailOnly)])[0].canSave).toBe(true);
    expect(review([row(phoneOnly)])[0].canSave).toBe(true);
  });

  it("flags values that can't be read as unclear, with those the reader marked", () => {
    const [result] = review([row({ ...full, sex: "؟", birthday: "32/13/1990" }, 2, ["teacherName"])]);

    expect(result.flags).toContainEqual({ kind: "unclear", fields: ["teacherName", "sex", "birthday"] });
    expect(result.canSave).toBe(false);
  });

  it("does not count an unreadable phone as a contact", () => {
    const [result] = review([row({ teacherName: "سارة نصر", sex: "أنثى", phone: "12345" })]);

    expect(kinds(result.flags)).toEqual(expect.arrayContaining(["unclear"]));
    expect(result.canSave).toBe(false);
  });

  it("warns about missing optional data without blocking", () => {
    const [result] = review([row({ teacherName: "سارة نصر", sex: "أنثى", phone: "0599222222" })]);

    expect(result.flags).toEqual([{ kind: "missingOptional", fields: ["bloodType", "address", "birthday"] }]);
    expect(result.canSave).toBe(true);
  });

  it("flags the same email or phone twice in the file", () => {
    const results = review([
      row(full, 2),
      row({ ...full, phone: "0599333333", email: "SARA@school.ps" }, 3),
      row({ ...full, email: "other@school.ps" }, 4),
      row({ ...full, email: "new@school.ps", phone: "0599444444" }, 5),
    ]);

    expect(results[0].flags).toContainEqual({ kind: "duplicateInFile", otherRows: [3, 4] });
    expect(results[1].flags).toContainEqual({ kind: "duplicateInFile", otherRows: [2] });
    expect(results[2].flags).toContainEqual({ kind: "duplicateInFile", otherRows: [2] });
    expect(results[3].canSave).toBe(true);
  });

  it("ignores skipped rows, also when looking for duplicates", () => {
    const results = review([row(full, 2), row(full, 3)], [], { 3: { skip: true } });

    expect(results[0]).toMatchObject({ status: "new", canSave: true });
    expect(results[1]).toMatchObject({ status: "skipped", flags: [], canSave: false });
  });

  it("finds an existing teacher by email and shows no changes for the same data", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", email: "Omar@School.ps", sex: "ذكر" })],
      [teacher({})],
    );

    expect(result).toMatchObject({ status: "noChanges", existingId: "t1", changes: [], canSave: true });
  });

  it("finds an existing teacher by phone and lists the real changes", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", phone: "0599111111", email: "omar.new@school.ps", sex: "ذكر", address: "جنين" })],
      [teacher({})],
    );

    expect(result).toMatchObject({ status: "update", existingId: "t1" });
    expect(result.changes).toEqual([
      { field: "email", from: "omar@school.ps", to: "omar.new@school.ps", accepted: true },
      { field: "address", from: "نابلس", to: "جنين", accepted: true },
    ]);
  });

  it("never lists an empty cell as a change", () => {
    const [result] = review([row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر" })], [teacher({})]);

    expect(result.changes).toEqual([]);
  });

  it("does not warn about optional data the existing teacher already has", () => {
    const [result] = review([row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر" })], [teacher({})]);

    expect(result.flags).toEqual([]);
  });

  it("becomes no changes when the admin turns every change down", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر", address: "جنين" })],
      [teacher({})],
      { 2: { rejectedChanges: ["address"] } },
    );

    expect(result.status).toBe("noChanges");
    expect(result.changes).toEqual([{ field: "address", from: "نابلس", to: "جنين", accepted: false }]);
  });

  it("blocks a row whose email is one teacher's and whose phone is another's", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", email: "omar@school.ps", phone: "0599222222", sex: "ذكر" })],
      [teacher({}), teacher({ id: "t2", name: "سارة نصر", email: null, phone: "0599222222" })],
    );

    expect(result.flags).toContainEqual({ kind: "contactTaken", fields: ["phone"] });
    expect(result.canSave).toBe(false);
  });
});

describe("a teacher row's subjects", () => {
  it("gives a row without subjects none, and no flag", () => {
    const [result] = review([row(full)]);

    expect(result.subjects).toEqual([]);
    expect(result.flags).toEqual([]);
  });

  it("matches subjects by name and grade", () => {
    const [result] = review([row({ ...full, subjects: "رياضيات 7، علوم" })]);

    expect(result.subjects).toEqual([
      { id: 1, name: "رياضيات", level: 7, isNew: true },
      { id: 3, name: "علوم", level: 7, isNew: true },
    ]);
    expect(result.canSave).toBe(true);
  });

  it("flags a subject the school doesn't have, and one that matches several grades", () => {
    const [result] = review([row({ ...full, subjects: "رياضيات، كيمياء" })]);

    expect(result.flags).toContainEqual({
      kind: "unknownSubject",
      subjects: [
        { text: "رياضيات", candidates: [{ id: 1, name: "رياضيات", level: 7 }, { id: 2, name: "رياضيات", level: 8 }] },
        { text: "كيمياء", candidates: [] },
      ],
    });
    expect(result.canSave).toBe(false);
  });

  it("is ready once the admin picks the subject or removes it", () => {
    const [result] = review([row({ ...full, subjects: "رياضيات، كيمياء" })], [], {
      2: { subjectChoices: { رياضيات: 2, كيمياء: null } },
    });

    expect(result.subjects.map((subject) => subject.id)).toEqual([2]);
    expect(result.canSave).toBe(true);
  });

  it("blocks a subject whose grade has no classes, until it is removed", () => {
    const [blocked] = review([row({ ...full, subjects: "فن، علوم" })]);
    expect(blocked.flags).toContainEqual({ kind: "subjectWithoutClasses", subjects: [{ text: "فن", id: 4, name: "فن", level: 9 }] });
    expect(blocked.canSave).toBe(false);

    const [fixed] = review([row({ ...full, subjects: "فن، علوم" })], [], { 2: { subjectChoices: { فن: null } } });
    expect(fixed.subjects.map((subject) => subject.id)).toEqual([3]);
    expect(fixed.canSave).toBe(true);
  });

  it("marks only the subjects an existing teacher doesn't have yet, and becomes an update", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر", subjects: "رياضيات 7، علوم" })],
      [teacher({ subjectIds: [1] })],
    );

    expect(result.status).toBe("update");
    expect(result.subjects).toEqual([
      { id: 1, name: "رياضيات", level: 7, isNew: false },
      { id: 3, name: "علوم", level: 7, isNew: true },
    ]);
  });

  it("shows no changes when an existing teacher already has every subject in the file", () => {
    const [result] = review(
      [row({ teacherName: "عمر صالح", email: "omar@school.ps", sex: "ذكر", subjects: "رياضيات 7" })],
      [teacher({ subjectIds: [1, 3] })],
    );

    expect(result.status).toBe("noChanges");
  });
});
