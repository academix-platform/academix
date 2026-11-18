import { describe, expect, it } from "vitest";

import {
  findParentByPhone,
  findStudentMatch,
  findTeacherMatch,
  matchClass,
  normalizeName,
  studentChanges,
  type ExistingStudent,
  type SchoolClass,
} from "./matching";

const classes: SchoolClass[] = [
  { id: 1, name: "السابع أ", gradeId: 7, capacity: 30, studentCount: 10 },
  { id: 2, name: "السابع ب", gradeId: 7, capacity: 30, studentCount: 10 },
  { id: 3, name: "8A", gradeId: 8, capacity: 30, studentCount: 10 },
];

const student = (fields: Partial<ExistingStudent>): ExistingStudent => ({
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

describe("normalizeName", () => {
  it("ignores spaces, hamza forms, taa marbuta, alef maqsura, tatweel and diacritics", () => {
    expect(normalizeName("  أحمد   مـحمّد  ")).toBe(normalizeName("احمد محمد"));
    expect(normalizeName("فاطمة")).toBe(normalizeName("فاطمه"));
    expect(normalizeName("مصطفى")).toBe(normalizeName("مصطفي"));
    expect(normalizeName("إسلام")).toBe(normalizeName("اسلام"));
  });

  it("ignores letter case in Latin names", () => {
    expect(normalizeName("Lina HADDAD")).toBe(normalizeName("lina haddad"));
  });
});

describe("matchClass", () => {
  it("finds the school's class by name", () => {
    expect(matchClass("السابع أ", classes)?.id).toBe(1);
    expect(matchClass("السابع  ا", classes)?.id).toBe(1);
    expect(matchClass("8a", classes)?.id).toBe(3);
  });

  it("finds nothing for a class the school doesn't have", () => {
    expect(matchClass("التاسع أ", classes)).toBeNull();
    expect(matchClass("", classes)).toBeNull();
  });
});

describe("findStudentMatch", () => {
  const school = [
    student({ id: "with_id", name: "ليلى حداد", nationalId: "123456782", classId: 2 }),
    student({ id: "old", name: "محمد الخطيب", nationalId: null, classId: 1 }),
    student({ id: "old_other_class", name: "محمد الخطيب", nationalId: null, classId: 2 }),
  ];

  it("finds a student by national ID", () => {
    expect(findStudentMatch({ nationalId: "123456782", name: "اسم آخر", classId: 1 }, school)).toEqual({
      kind: "byNationalId",
      student: school[0],
    });
  });

  it("offers an old student without an ID who has the same name and class", () => {
    expect(findStudentMatch({ nationalId: "000000018", name: "محمّد  الخطيب", classId: 1 }, school)).toEqual({
      kind: "maybe",
      candidates: [school[1]],
    });
  });

  it("doesn't offer students who already have an ID, or are in another class", () => {
    expect(findStudentMatch({ nationalId: "000000018", name: "ليلى حداد", classId: 2 }, school)).toEqual({ kind: "none" });
    expect(findStudentMatch({ nationalId: "000000018", name: "محمد الخطيب", classId: 3 }, school)).toEqual({ kind: "none" });
  });

  it("finds nobody for a new student", () => {
    expect(findStudentMatch({ nationalId: "000000018", name: "يوسف عودة", classId: 1 }, school)).toEqual({ kind: "none" });
  });

  it("can't match by name without a class", () => {
    expect(findStudentMatch({ nationalId: null, name: "محمد الخطيب", classId: null }, school)).toEqual({ kind: "none" });
  });
});

describe("findParentByPhone", () => {
  const parents = [{ id: "p1", name: "سامي حداد", phone: "0599123456", email: null, address: null }];

  it("finds the parent with the same phone", () => {
    expect(findParentByPhone("0599123456", parents)?.id).toBe("p1");
  });

  it("finds nobody for another phone or no phone", () => {
    expect(findParentByPhone("0599000000", parents)).toBeNull();
    expect(findParentByPhone(undefined, parents)).toBeNull();
  });
});

describe("findTeacherMatch", () => {
  const teachers = [
    { id: "t1", name: "عمر صالح", email: "omar@school.ps", phone: "0599111111" },
    { id: "t2", name: "سارة نصر", email: null, phone: "0599222222" },
  ];

  it("finds a teacher by email, ignoring case", () => {
    expect(findTeacherMatch({ email: "OMAR@school.ps" }, teachers)?.id).toBe("t1");
  });

  it("finds a teacher by phone", () => {
    expect(findTeacherMatch({ phone: "0599222222" }, teachers)?.id).toBe("t2");
  });

  it("finds nobody without an email or phone that matches", () => {
    expect(findTeacherMatch({ email: "new@school.ps", phone: "0599333333" }, teachers)).toBeNull();
    expect(findTeacherMatch({}, teachers)).toBeNull();
  });
});

describe("studentChanges", () => {
  const existing = student({
    name: "محمد الخطيب",
    nationalId: "123456782",
    classId: 1,
    sex: "MALE",
    birthday: new Date("2013-04-02"),
    bloodType: "A+",
    address: "غزة",
    phone: null,
    email: "old@example.com",
  });

  it("lists only the fields that would change", () => {
    const changes = studentChanges(
      { name: "محمد الخطيب", classId: 2, sex: "MALE", birthday: new Date("2013-04-02"), bloodType: "B+", address: "غزة" },
      existing,
      classes,
    );
    expect(changes).toEqual([
      { field: "className", from: "السابع أ", to: "السابع ب" },
      { field: "bloodType", from: "A+", to: "B+" },
    ]);
  });

  it("never lists an empty cell as a change", () => {
    expect(studentChanges({ name: "محمد الخطيب" }, existing, classes)).toEqual([]);
    expect(studentChanges({ address: undefined, email: undefined, birthday: undefined }, existing, classes)).toEqual([]);
    expect(studentChanges({ address: "", email: "", bloodType: "", name: "" }, existing, classes)).toEqual([]);
  });

  it("treats a name written differently as the same name", () => {
    expect(studentChanges({ name: "محمّد  الخطيب" }, existing, classes)).toEqual([]);
  });

  it("lists adding a national ID to an old student", () => {
    expect(studentChanges({ nationalId: "000000018" }, { ...existing, nationalId: null }, classes)).toEqual([
      { field: "nationalId", from: "", to: "000000018" },
    ]);
  });

  it("lists a filled value for an empty field", () => {
    expect(studentChanges({ phone: "0599123456" }, existing, classes)).toEqual([
      { field: "studentPhone", from: "", to: "0599123456" },
    ]);
  });

  it("compares emails ignoring case", () => {
    expect(studentChanges({ email: "OLD@example.com" }, existing, classes)).toEqual([]);
  });
});
