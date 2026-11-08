import { describe, expect, it } from "vitest";
import { attendanceDateError } from "@/lib/attendanceRules";
import { fakeResultDb } from "@/lib/results/testing/fakeResultDb";
import { buildSheetRows } from "./sheetRows";
import {
  createAttendanceSheetWith,
  loadAttendanceClasses,
  loadAttendanceEntry,
  loadAttendanceSheetForPrint,
  loadAttendanceSheets,
  saveAttendanceSheetWith,
  sheetAttendanceDateError,
} from "./attendanceSheet";

const SHEET_ID = "3f0c9a52-6d1e-4b8a-9c7f-2b1d4e5a6f70";
const teacher = { userId: "teacher_1", role: "teacher", schoolId: 1 };
const otherTeacher = { userId: "teacher_2", role: "teacher", schoolId: 1 };
const admin = { userId: "admin_1", role: "admin", schoolId: 1 };
const otherSchoolAdmin = { userId: "admin_9", role: "admin", schoolId: 2 };
const year = { id: 5, startDate: "2026-09-01", endDate: "2027-06-30" };

const classes = [
  { id: 3, schoolId: 1, name: "7A", supervisorId: "teacher_1" },
  { id: 4, schoolId: 1, name: "7B", supervisorId: "teacher_2" },
  { id: 5, schoolId: 1, name: "8A", supervisorId: null },
  { id: 9, schoolId: 2, name: "9A", supervisorId: "teacher_9" },
];

const classStudents = (count: number, fields: Record<string, unknown> = {}) =>
  Array.from({ length: count }, (_, index) => ({
    id: `s${String(index + 1).padStart(2, "0")}`,
    name: `طالب ${String(index + 1).padStart(2, "0")}`,
    schoolId: 1,
    classId: 3,
    status: "ACTIVE",
    ...fields,
  }));

const codes = (...values: string[]) => () => values.shift() ?? "ZZZZZZ";
const request = (fields: Partial<{ classId: number; date: string }> = {}) => ({
  classId: 3,
  date: "2026-11-08",
  ...fields,
});

describe("loadAttendanceClasses", () => {
  it("gives a teacher only the classes they supervise", async () => {
    const { db } = fakeResultDb({ classes });

    expect(await loadAttendanceClasses(db, teacher)).toEqual([classes[0]]);
  });

  it("gives an admin every class in their school", async () => {
    const { db } = fakeResultDb({ classes });

    expect((await loadAttendanceClasses(db, admin)).map((found) => found.id)).toEqual([3, 4, 5]);
  });

  it("gives another school's admin none of these classes", async () => {
    const { db } = fakeResultDb({ classes });

    expect((await loadAttendanceClasses(db, otherSchoolAdmin)).map((found) => found.id)).toEqual([9]);
  });
});

describe("createAttendanceSheetWith", () => {
  it("saves the class list with the date and a code", async () => {
    const { db, sheets } = fakeResultDb({ classes, students: classStudents(2) });

    const outcome = await createAttendanceSheetWith(db, teacher, request(), year, codes("ABC234"));

    expect(outcome).toEqual({ sheetId: sheets[0].id, code: "ABC234", pageCount: 1 });
    expect(sheets[0]).toMatchObject({
      code: "ABC234",
      kind: "ATTENDANCE",
      schoolId: 1,
      academicYearId: 5,
      classId: 3,
      examId: null,
      assignmentId: null,
      createdById: "teacher_1",
      rows: [
        { page: 1, rowNumber: 1, studentId: "s01", name: "طالب 01" },
        { page: 1, rowNumber: 2, studentId: "s02", name: "طالب 02" },
      ],
    });
    expect(sheets[0].date).toEqual(new Date("2026-11-08T00:00:00.000Z"));
  });

  it("lists only current students of the class", async () => {
    const students = [
      ...classStudents(1),
      { ...classStudents(2)[1], status: "REPEATED" },
      { ...classStudents(3)[2], status: "LEFT" },
      { ...classStudents(4)[3], status: "GRADUATED" },
      { ...classStudents(5)[4], classId: 4 },
      { ...classStudents(6)[5], schoolId: 2 },
    ];
    const { db, sheets } = fakeResultDb({ classes, students });

    await createAttendanceSheetWith(db, teacher, request(), year, codes("ABC234"));

    expect(sheets[0].rows.map((row: { studentId: string }) => row.studentId)).toEqual(["s01", "s02"]);
  });

  it("puts a class of 31 on two pages", async () => {
    const { db } = fakeResultDb({ classes, students: classStudents(31) });

    expect(await createAttendanceSheetWith(db, teacher, request(), year, codes("ABC234"))).toMatchObject({
      pageCount: 2,
    });
  });

  it("lets an admin print any class in their school", async () => {
    const { db } = fakeResultDb({ classes, students: classStudents(1, { classId: 4 }) });

    expect(
      await createAttendanceSheetWith(db, admin, request({ classId: 4 }), year, codes("ABC234")),
    ).toMatchObject({ code: "ABC234" });
  });

  it("refuses a teacher who doesn't supervise the class", async () => {
    const { db, sheets } = fakeResultDb({ classes, students: classStudents(1) });

    expect(await createAttendanceSheetWith(db, otherTeacher, request(), year, codes("ABC234"))).toEqual({
      error: "notFound",
    });
    expect(sheets).toEqual([]);
  });

  it("refuses a class from another school", async () => {
    const { db, sheets } = fakeResultDb({ classes, students: classStudents(1) });

    expect(await createAttendanceSheetWith(db, otherSchoolAdmin, request(), year, codes("ABC234"))).toEqual({
      error: "notFound",
    });
    expect(sheets).toEqual([]);
  });

  it.each(["", "2026-13-01", "2026-02-30", "08/11/2026"])("refuses the date %j", async (date) => {
    const { db, sheets } = fakeResultDb({ classes, students: classStudents(1) });

    expect(await createAttendanceSheetWith(db, teacher, request({ date }), year, codes("ABC234"))).toEqual({
      error: "badDate",
    });
    expect(sheets).toEqual([]);
  });

  it.each(["2026-08-31", "2027-07-01"])("refuses %s, outside the academic year", async (date) => {
    const { db } = fakeResultDb({ classes, students: classStudents(1) });

    expect(await createAttendanceSheetWith(db, teacher, request({ date }), year, codes("ABC234"))).toEqual({
      error: "outsideYear",
    });
  });

  it("refuses a class with no current students", async () => {
    const { db, sheets } = fakeResultDb({ classes, students: classStudents(2, { status: "LEFT" }) });

    expect(await createAttendanceSheetWith(db, teacher, request(), year, codes("ABC234"))).toEqual({
      error: "noStudents",
    });
    expect(sheets).toEqual([]);
  });

  it("picks another code when the first is taken in the school", async () => {
    const { db } = fakeResultDb({
      classes,
      students: classStudents(1),
      sheets: [{ id: "old", schoolId: 1, code: "TAKEN2" }],
    });

    expect(
      await createAttendanceSheetWith(db, teacher, request(), year, codes("TAKEN2", "FRESH3")),
    ).toMatchObject({ code: "FRESH3" });
  });
});

describe("loadAttendanceSheetForPrint", () => {
  const students = Array.from({ length: 31 }, (_, index) => ({ id: `s${index + 1}`, name: `طالب ${index + 1}` }));
  const sheet = (fields: Record<string, unknown> = {}) => ({
    id: SHEET_ID,
    schoolId: 1,
    code: "ABC234",
    kind: "ATTENDANCE",
    classId: 3,
    date: new Date("2026-11-08T00:00:00.000Z"),
    rows: buildSheetRows(students.slice(0, 2)),
    school: { name: "مدرسة التجربة" },
    class: { name: "7A", supervisorId: "teacher_1" },
    ...fields,
  });

  it("returns the class, date, code and rows", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheetForPrint(db, teacher, SHEET_ID)).toEqual({
      code: "ABC234",
      schoolName: "مدرسة التجربة",
      className: "7A",
      classId: 3,
      date: "2026-11-08",
      pages: [buildSheetRows(students.slice(0, 2))],
    });
  });

  it("splits a class of 31 into pages of 30 and 1", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ rows: buildSheetRows(students) })] });

    const printed = await loadAttendanceSheetForPrint(db, teacher, SHEET_ID);

    expect(printed?.pages.map((page) => page.length)).toEqual([30, 1]);
  });

  it("lets an admin print any attendance sheet in their school", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheetForPrint(db, admin, SHEET_ID)).not.toBeNull();
  });

  it("refuses a teacher who doesn't supervise the class", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheetForPrint(db, otherTeacher, SHEET_ID)).toBeNull();
  });

  it("refuses a sheet from another school", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheetForPrint(db, otherSchoolAdmin, SHEET_ID)).toBeNull();
  });

  it("doesn't print a results sheet as an attendance sheet", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ kind: "RESULT" })] });

    expect(await loadAttendanceSheetForPrint(db, admin, SHEET_ID)).toBeNull();
  });

  it.each(["", "not-a-uuid"])("returns nothing for the id %j", async (id) => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheetForPrint(db, admin, id)).toBeNull();
  });

  it.each([{ rows: [{ page: 1 }] }, { date: null }])("returns nothing for damaged data %j", async (fields) => {
    const { db } = fakeResultDb({ sheets: [sheet(fields)] });

    expect(await loadAttendanceSheetForPrint(db, admin, SHEET_ID)).toBeNull();
  });
});

describe("loadAttendanceSheets", () => {
  const sheet = (fields: Record<string, unknown> = {}) => ({
    id: "sheet-1",
    schoolId: 1,
    code: "ABC234",
    kind: "ATTENDANCE",
    classId: 3,
    date: new Date("2026-11-08T00:00:00.000Z"),
    rows: buildSheetRows([{ id: "s1", name: "طالب 1" }]),
    class: { name: "7A", supervisorId: "teacher_1" },
    ...fields,
  });
  const ref = { classId: 3, date: "2026-11-08" };

  it("returns every sheet printed for the class and date, with its rows", async () => {
    const { db } = fakeResultDb({ sheets: [sheet(), sheet({ id: "sheet-2", code: "DEF567" })] });

    const sheets = await loadAttendanceSheets(db, teacher, ref);

    expect(sheets.map((found) => found.code)).toEqual(["ABC234", "DEF567"]);
    expect(sheets[0]).toEqual({ id: "sheet-1", code: "ABC234", rows: buildSheetRows([{ id: "s1", name: "طالب 1" }]) });
  });

  it("leaves out sheets for another date or class", async () => {
    const { db } = fakeResultDb({
      sheets: [sheet({ date: new Date("2026-11-07T00:00:00.000Z") }), sheet({ id: "sheet-2", classId: 4 })],
    });

    expect(await loadAttendanceSheets(db, teacher, ref)).toEqual([]);
  });

  it("leaves out results sheets", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ kind: "RESULT" })] });

    expect(await loadAttendanceSheets(db, admin, ref)).toEqual([]);
  });

  it("gives a teacher who doesn't supervise the class nothing", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheets(db, otherTeacher, ref)).toEqual([]);
  });

  it("gives another school nothing", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheets(db, otherSchoolAdmin, ref)).toEqual([]);
  });

  it("returns nothing for an invalid date", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadAttendanceSheets(db, admin, { classId: 3, date: "2026-02-30" })).toEqual([]);
  });

  it("skips a sheet whose stored rows are damaged", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ rows: "broken" })] });

    expect(await loadAttendanceSheets(db, admin, ref)).toEqual([]);
  });
});

describe("loadAttendanceEntry", () => {
  const day = new Date("2026-11-08T00:00:00.000Z");
  const saved = (studentId: string, present: boolean, fields: Record<string, unknown> = {}) => ({
    schoolId: 1,
    academicYearId: 5,
    date: day,
    studentId,
    present,
    ...fields,
  });

  it("lists current students with the attendance already saved for that date", async () => {
    const { db } = fakeResultDb({
      students: classStudents(3),
      attendance: [
        saved("s01", false),
        saved("s02", true, { date: new Date("2026-11-07T00:00:00.000Z") }),
        saved("s03", true, { academicYearId: 4 }),
      ],
    });

    expect(await loadAttendanceEntry(db, 1, { classId: 3, date: "2026-11-08", academicYearId: 5 })).toEqual([
      { studentId: "s01", name: "طالب 01", existingPresent: false },
      { studentId: "s02", name: "طالب 02", existingPresent: null },
      { studentId: "s03", name: "طالب 03", existingPresent: null },
    ]);
  });

  it("ignores another school's records", async () => {
    const { db } = fakeResultDb({ students: classStudents(1), attendance: [saved("s01", false, { schoolId: 2 })] });

    expect(await loadAttendanceEntry(db, 1, { classId: 3, date: "2026-11-08", academicYearId: 5 })).toEqual([
      { studentId: "s01", name: "طالب 01", existingPresent: null },
    ]);
  });
});

describe("sheetAttendanceDateError", () => {
  const today = "2026-11-08";

  it.each(["2026-11-08", "2026-11-07", "2026-11-01"])("accepts %s, today or up to 7 days earlier", (date) => {
    expect(sheetAttendanceDateError(date, today, year)).toBeNull();
  });

  it("refuses 8 days late", () => {
    expect(sheetAttendanceDateError("2026-10-31", today, year)).toBe(
      "Attendance from a sheet can only be saved up to 7 days late.",
    );
  });

  it.each(["2026-11-09", "2027-01-01"])("refuses the future date %s", (date) => {
    expect(sheetAttendanceDateError(date, today, year)).toBe("Attendance can't be saved for a future date.");
  });

  it("refuses a date inside the 7 days but before the academic year started", () => {
    expect(sheetAttendanceDateError("2026-08-31", "2026-09-03", year)).toBe(
      "This date is outside the current academic year.",
    );
  });

  it("counts across the end of a month and a leap day", () => {
    const leapYear = { id: 6, startDate: "2027-09-01", endDate: "2028-06-30" };

    expect(sheetAttendanceDateError("2028-02-28", "2028-03-06", leapYear)).toBeNull();
    expect(sheetAttendanceDateError("2028-02-27", "2028-03-06", leapYear)).not.toBeNull();
  });

  it.each([null, "", "2026-02-30", "08/11/2026"])("refuses the invalid date %j", (date) => {
    expect(sheetAttendanceDateError(date, today, year)).toBe("Invalid date.");
  });

  it("leaves direct attendance today-only", () => {
    expect(attendanceDateError("2026-11-07", today, year)).toBe("Attendance can only be saved for today.");
  });
});

describe("saveAttendanceSheetWith", () => {
  const today = "2026-11-08";
  const day = new Date("2026-11-08T00:00:00.000Z");
  const sheet = (fields: Record<string, unknown> = {}) => ({
    id: SHEET_ID,
    schoolId: 1,
    code: "ABC234",
    kind: "ATTENDANCE",
    academicYearId: 5,
    classId: 3,
    date: day,
    rows: buildSheetRows(classStudents(3)),
    class: { name: "7A", supervisorId: "teacher_1" },
    ...fields,
  });
  const rows = [
    { studentId: "s01", present: true },
    { studentId: "s02", present: false },
  ];
  const save = (db: Parameters<typeof saveAttendanceSheetWith>[0], access = teacher, input = {}) =>
    saveAttendanceSheetWith(db, access, { sheetId: SHEET_ID, rows, ...input }, { today, year });

  it("saves every row on the sheet's date", async () => {
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students: classStudents(3) });

    expect(await save(db)).toEqual({ savedCount: 2, date: "2026-11-08" });
    expect(attendance).toEqual([
      { schoolId: 1, studentId: "s01", academicYearId: 5, date: day, present: true },
      { schoolId: 1, studentId: "s02", academicYearId: 5, date: day, present: false },
    ]);
  });

  it("saves a sheet dated 7 days ago", async () => {
    const { db, attendance } = fakeResultDb({
      sheets: [sheet({ date: new Date("2026-11-01T00:00:00.000Z") })],
      students: classStudents(3),
    });

    expect(await save(db)).toMatchObject({ savedCount: 2, date: "2026-11-01" });
    expect(attendance[0].date).toEqual(new Date("2026-11-01T00:00:00.000Z"));
  });

  it("refuses a sheet dated 8 days ago and saves nothing", async () => {
    const { db, attendance } = fakeResultDb({
      sheets: [sheet({ date: new Date("2026-10-31T00:00:00.000Z") })],
      students: classStudents(3),
    });

    expect(await save(db)).toEqual({ error: "Attendance from a sheet can only be saved up to 7 days late." });
    expect(attendance).toEqual([]);
  });

  it("refuses a sheet dated in the future", async () => {
    const { db, attendance } = fakeResultDb({
      sheets: [sheet({ date: new Date("2026-11-09T00:00:00.000Z") })],
      students: classStudents(3),
    });

    expect(await save(db)).toEqual({ error: "Attendance can't be saved for a future date." });
    expect(attendance).toEqual([]);
  });

  it("refuses a sheet from another academic year", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ academicYearId: 4 })], students: classStudents(3) });

    expect(await save(db)).toEqual({ error: "This sheet is from another academic year." });
  });

  it("replaces attendance already saved for the date", async () => {
    const { db, attendance } = fakeResultDb({
      sheets: [sheet()],
      students: classStudents(3),
      attendance: [{ schoolId: 1, studentId: "s02", academicYearId: 5, date: day, present: true }],
    });

    await save(db);

    expect(attendance).toHaveLength(2);
    expect(attendance.find((record) => record.studentId === "s02")?.present).toBe(false);
  });

  it("refuses a teacher who doesn't supervise the class", async () => {
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students: classStudents(3) });

    expect(await save(db, otherTeacher)).toEqual({ error: "Sheet not found." });
    expect(attendance).toEqual([]);
  });

  it("refuses a sheet from another school", async () => {
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students: classStudents(3) });

    expect(await save(db, otherSchoolAdmin)).toEqual({ error: "Sheet not found." });
    expect(attendance).toEqual([]);
  });

  it("lets an admin save any attendance sheet in their school", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()], students: classStudents(3) });

    expect(await save(db, admin)).toMatchObject({ savedCount: 2 });
  });

  it("refuses a results sheet", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ kind: "RESULT" })], students: classStudents(3) });

    expect(await save(db, admin)).toEqual({ error: "Sheet not found." });
  });

  it("refuses the whole save when one student has left the class", async () => {
    const students = [...classStudents(1), { ...classStudents(2)[1], status: "LEFT" }];
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students });

    expect(await save(db)).toEqual({
      error: "This student is no longer in this class, so their attendance can't be saved.",
      studentId: "s02",
    });
    expect(attendance).toEqual([]);
  });

  it("refuses a student from another class", async () => {
    const students = [...classStudents(1), { ...classStudents(2)[1], classId: 4 }];
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students });

    expect(await save(db)).toMatchObject({ studentId: "s02" });
    expect(attendance).toEqual([]);
  });

  it.each([
    ["no rows", { rows: [] }],
    ["the same student twice", { rows: [rows[0], rows[0]] }],
    ["a bad sheet id", { sheetId: "not-a-uuid" }],
    ["a value that isn't true or false", { rows: [{ studentId: "s01", present: "yes" }] }],
  ])("refuses %s", async (_name, input) => {
    const { db, attendance } = fakeResultDb({ sheets: [sheet()], students: classStudents(3) });

    expect(await save(db, teacher, input)).toHaveProperty("error");
    expect(attendance).toEqual([]);
  });
});
