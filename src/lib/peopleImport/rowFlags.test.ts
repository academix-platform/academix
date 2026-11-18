import { describe, expect, it } from "vitest";

import type { ExistingParent, ExistingStudent, SchoolClass } from "./matching";
import { parseStudentValues, reviewStudentRows, type RowFlag, type StudentContext } from "./rowFlags";

const classes: SchoolClass[] = [
  { id: 1, name: "السابع أ", gradeId: 7, capacity: 30, studentCount: 0 },
  { id: 2, name: "السابع ب", gradeId: 7, capacity: 30, studentCount: 0 },
];
const existingStudent = (fields: Partial<ExistingStudent>): ExistingStudent => ({
  id: "s1",
  name: "محمد الخطيب",
  nationalId: null,
  classId: 1,
  sex: "MALE",
  birthday: null,
  bloodType: null,
  address: null,
  phone: null,
  email: null,
  parentId: null,
  ...fields,
});
const parents: ExistingParent[] = [{ id: "p1", name: "سامي حداد", phone: "0599123456", email: null, address: null }];
const context = (students: ExistingStudent[] = []): StudentContext => ({ classes, students, parents });

const full = {
  studentName: "ليلى حداد",
  nationalId: "123456782",
  className: "السابع ب",
  sex: "أنثى",
  birthday: "2013-09-14",
  bloodType: "O+",
  address: "رام الله",
};
const row = (values: Record<string, string>, sourceRow = 2, unclear?: string[]) =>
  ({ sourceRow, values, ...(unclear && { unclear }) }) as Parameters<typeof reviewStudentRows>[0][number];

const review = (rows: ReturnType<typeof row>[], students: ExistingStudent[] = [], decisions = {}) =>
  reviewStudentRows(rows, context(students), decisions);
const kinds = (flags: RowFlag[]) => flags.map((flag) => flag.kind);

describe("parseStudentValues", () => {
  it("reads sex in Arabic and English", () => {
    for (const male of ["ذكر", "ذ", "M", "male", "Male", "ولد"]) expect(parseStudentValues({ sex: male }).values.sex).toBe("MALE");
    for (const female of ["أنثى", "انثى", "أ", "F", "female", "بنت"]) {
      expect(parseStudentValues({ sex: female }).values.sex).toBe("FEMALE");
    }
  });

  it("reads day-first and ISO birthdays", () => {
    expect(parseStudentValues({ birthday: "14/9/2013" }).values.birthday).toEqual(new Date("2013-09-14"));
    expect(parseStudentValues({ birthday: "2013-09-14" }).values.birthday).toEqual(new Date("2013-09-14"));
  });

  it("tidies blood types, phones and emails", () => {
    const { values } = parseStudentValues({ bloodType: "ab -", parentPhone: "+970 599-123-456", studentEmail: " Lina@Example.com " });
    expect(values).toMatchObject({ bloodType: "AB-", parentPhone: "0599123456", email: "lina@example.com" });
  });

  it("marks values it can't read as unclear instead of guessing", () => {
    const { unclear } = parseStudentValues({
      sex: "؟",
      birthday: "31/02/2013",
      bloodType: "C+",
      studentEmail: "not an email",
      parentPhone: "12345",
    });
    expect(unclear.sort()).toEqual(["birthday", "bloodType", "parentPhone", "sex", "studentEmail"]);
  });
});

describe("reviewStudentRows: new students", () => {
  it("is ready to save when every required field is valid", () => {
    const [reviewed] = review([row(full)]);
    expect(reviewed).toMatchObject({ status: "new", canSave: true, flags: [] });
    expect(reviewed.student).toMatchObject({ name: "ليلى حداد", nationalId: "123456782", classId: 2, sex: "FEMALE" });
  });

  it("warns, without blocking, when blood type, address or birthday is missing", () => {
    const [reviewed] = review([row({ studentName: "ليلى حداد", nationalId: "123456782", className: "السابع ب", sex: "أنثى" })]);
    expect(reviewed.flags).toEqual([{ kind: "missingOptional", fields: ["bloodType", "address", "birthday"] }]);
    expect(reviewed.canSave).toBe(true);
  });

  it("blocks a row missing a name, class, sex or national ID", () => {
    const [reviewed] = review([row({ bloodType: "O+" })]);
    expect(reviewed.flags).toContainEqual({
      kind: "requiredMissing",
      fields: ["studentName", "className", "sex", "nationalId"],
    });
    expect(reviewed.canSave).toBe(false);
  });

  it("blocks an ID with the wrong length or a changed digit", () => {
    const [tooLong, changed] = review([row({ ...full, nationalId: "1234567820" }, 2), row({ ...full, nationalId: "123456784" }, 3)]);
    expect(tooLong.flags).toContainEqual({ kind: "invalidNationalId", reason: "format" });
    expect(changed.flags).toContainEqual({ kind: "invalidNationalId", reason: "checkDigit" });
    expect(changed.canSave).toBe(false);
  });

  it("blocks a value Gemini marked as unclear, or one that can't be read", () => {
    const [marked, unreadable] = review([row(full, 2, ["address"]), row({ ...full, sex: "؟" }, 3)]);
    expect(marked.flags).toContainEqual({ kind: "unclear", fields: ["address"] });
    expect(unreadable.flags).toContainEqual({ kind: "unclear", fields: ["sex"] });
    expect(marked.canSave).toBe(false);
  });

  it("blocks an unknown class until the admin picks one of the school's classes", () => {
    const rows = [row({ ...full, className: "التاسع أ" })];
    expect(review(rows)[0].flags).toContainEqual({ kind: "unknownClass" });
    expect(review(rows, [], { 2: { classId: 99 } })[0].canSave).toBe(false);

    const [picked] = review(rows, [], { 2: { classId: 1 } });
    expect(picked).toMatchObject({ canSave: true, student: { classId: 1 } });
  });

  it("blocks both rows when a national ID appears twice in the file", () => {
    const [first, second] = review([row(full, 2), row({ ...full, studentName: "اسم آخر" }, 7)]);
    expect(first.flags).toContainEqual({ kind: "duplicateInFile", otherRows: [7] });
    expect(second.flags).toContainEqual({ kind: "duplicateInFile", otherRows: [2] });
    expect(second.canSave).toBe(false);
  });

  it("leaves a skipped row out, whatever its flags", () => {
    const [skipped] = review([row({ bloodType: "O+" })], [], { 2: { skip: true } });
    expect(skipped).toMatchObject({ status: "skipped", canSave: false });
  });
});

describe("reviewStudentRows: existing students", () => {
  const lina = existingStudent({
    id: "lina",
    name: "ليلى حداد",
    nationalId: "123456782",
    classId: 2,
    sex: "FEMALE",
    birthday: new Date("2013-09-14"),
    bloodType: "O+",
    address: "رام الله",
  });

  it("shows no changes when the file matches the student", () => {
    const [reviewed] = review([row(full)], [lina]);
    expect(reviewed).toMatchObject({ status: "noChanges", existingId: "lina", changes: [], canSave: true });
  });

  it("shows the changes that would be saved", () => {
    const [reviewed] = review([row({ ...full, address: "نابلس" })], [lina]);
    expect(reviewed).toMatchObject({ status: "update", existingId: "lina" });
    expect(reviewed.changes).toEqual([{ field: "address", from: "رام الله", to: "نابلس", accepted: true }]);
  });

  it("never treats an empty cell as a change", () => {
    const [reviewed] = review([row({ studentName: "ليلى حداد", nationalId: "123456782", className: "السابع ب", sex: "أنثى" })], [lina]);
    expect(reviewed).toMatchObject({ status: "noChanges", changes: [] });
    expect(kinds(reviewed.flags)).not.toContain("missingOptional");
  });

  it("keeps a change the admin turned down out of the save", () => {
    const [reviewed] = review([row({ ...full, address: "نابلس" })], [lina], { 2: { rejectedChanges: ["address"] } });
    expect(reviewed.status).toBe("noChanges");
    expect(reviewed.changes).toEqual([{ field: "address", from: "رام الله", to: "نابلس", accepted: false }]);
  });

  describe("an old student without an ID", () => {
    const old = existingStudent({ id: "old", name: "ليلى حداد", classId: 2, nationalId: null });

    it("blocks the row until the admin says whether it is the same student", () => {
      const [reviewed] = review([row(full)], [old]);
      expect(reviewed.flags).toContainEqual({
        kind: "maybeSameStudent",
        candidates: [{ id: "old", name: "ليلى حداد", className: "السابع ب" }],
      });
      expect(reviewed.canSave).toBe(false);
    });

    it("updates the old student and adds the ID when the admin says it is the same", () => {
      const [reviewed] = review([row(full)], [old], { 2: { sameAs: "old" } });
      expect(reviewed).toMatchObject({ status: "update", existingId: "old", canSave: true });
      expect(reviewed.changes).toContainEqual({ field: "nationalId", from: "", to: "123456782", accepted: true });
    });

    it("adds a new student when the admin says it is someone else", () => {
      const [reviewed] = review([row(full)], [old], { 2: { asNew: true } });
      expect(reviewed).toMatchObject({ status: "new", canSave: true });
    });

    it("refuses a choice that wasn't offered", () => {
      expect(review([row(full)], [old], { 2: { sameAs: "lina" } })[0].canSave).toBe(false);
    });
  });
});

describe("reviewStudentRows: parents", () => {
  it("links to the existing parent with the same phone", () => {
    const [reviewed] = review([row({ ...full, parentName: "سامي حداد", parentPhone: "0599123456" })]);
    expect(reviewed.parent).toEqual({ status: "existing", id: "p1", changes: [] });
  });

  it("gives two rows with the same new phone one parent", () => {
    const [first, second] = review([
      row({ ...full, parentName: "خالد عودة", parentPhone: "0597777777" }, 2),
      row({ ...full, nationalId: "000000018", parentName: "خالد عودة", parentPhone: "0597777777" }, 3),
    ]);
    expect(first.parent).toEqual({ status: "new", phone: "0597777777", name: "خالد عودة", email: undefined });
    expect(second.parent).toEqual(first.parent);
  });

  it("needs a phone for a parent's name, and a name for a new parent's phone", () => {
    const [nameOnly, phoneOnly] = review([
      row({ ...full, parentName: "خالد عودة" }, 2),
      row({ ...full, nationalId: "000000018", parentPhone: "0597777777" }, 3),
    ]);
    expect(nameOnly.flags).toContainEqual({ kind: "requiredMissing", fields: ["parentPhone"] });
    expect(phoneOnly.flags).toContainEqual({ kind: "requiredMissing", fields: ["parentName"] });
  });

  it("has no parent when the row names none", () => {
    expect(review([row(full)])[0].parent).toEqual({ status: "none" });
  });
});
