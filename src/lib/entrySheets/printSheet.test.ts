import { describe, expect, it } from "vitest";
import { fakeResultDb } from "@/lib/results/testing/fakeResultDb";
import { buildSheetRows } from "./sheetRows";
import { loadSheetForPrint } from "./printSheet";

const SHEET_ID = "3f0c9a52-6d1e-4b8a-9c7f-2b1d4e5a6f70";
const teacher = { userId: "teacher_1", role: "teacher", schoolId: 1 };
const otherTeacher = { userId: "teacher_2", role: "teacher", schoolId: 1 };
const admin = { userId: "admin_1", role: "admin", schoolId: 1 };
const otherSchoolAdmin = { userId: "admin_9", role: "admin", schoolId: 2 };

const students = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s${index + 1}`, name: `طالب ${index + 1}` }));

const sheet = (fields: Record<string, unknown> = {}) => ({
  id: SHEET_ID,
  schoolId: 1,
  code: "ABC234",
  kind: "RESULT",
  rows: buildSheetRows(students(2)),
  school: { name: "مدرسة التجربة" },
  class: { name: "7A" },
  exam: {
    title: "اختبار الوحدة الأولى",
    teacherId: "teacher_1",
    lesson: null,
    questions: [{ points: 15 }, { points: 5 }],
  },
  assignment: null,
  ...fields,
});

describe("loadSheetForPrint", () => {
  it("returns the header fields and the rows of an exam sheet", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadSheetForPrint(db, teacher, SHEET_ID)).toEqual({
      code: "ABC234",
      schoolName: "مدرسة التجربة",
      className: "7A",
      title: "اختبار الوحدة الأولى",
      maxScore: 20,
      pages: [buildSheetRows(students(2))],
    });
  });

  it("uses an assignment's maximum score", async () => {
    const assignment = { title: "واجب", teacherId: "teacher_1", lesson: null, maxScore: 10 };
    const { db } = fakeResultDb({ sheets: [sheet({ exam: null, assignment })] });

    expect(await loadSheetForPrint(db, teacher, SHEET_ID)).toMatchObject({ title: "واجب", maxScore: 10 });
  });

  it("splits a class of 31 into pages of 30 and 1", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ rows: buildSheetRows(students(31)) })] });

    const printed = await loadSheetForPrint(db, teacher, SHEET_ID);

    expect(printed?.pages.map((page) => page.length)).toEqual([30, 1]);
    expect(printed?.pages[1][0]).toMatchObject({ page: 2, rowNumber: 31 });
  });

  it("lets a teacher print a sheet for a lesson they teach", async () => {
    const exam = { ...sheet().exam, teacherId: null, lesson: { teacherId: "teacher_1", classId: 3 } };
    const { db } = fakeResultDb({ sheets: [sheet({ exam })] });

    expect(await loadSheetForPrint(db, teacher, SHEET_ID)).not.toBeNull();
  });

  it("lets an admin print any sheet in their school", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadSheetForPrint(db, admin, SHEET_ID)).not.toBeNull();
  });

  it("refuses another teacher's sheet", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadSheetForPrint(db, otherTeacher, SHEET_ID)).toBeNull();
  });

  it("refuses a sheet from another school", async () => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadSheetForPrint(db, otherSchoolAdmin, SHEET_ID)).toBeNull();
  });

  it("doesn't print an attendance sheet as a results sheet", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ kind: "ATTENDANCE" })] });

    expect(await loadSheetForPrint(db, admin, SHEET_ID)).toBeNull();
  });

  it.each(["", "not-a-uuid", "1 OR 1=1"])("returns nothing for the id %j", async (id) => {
    const { db } = fakeResultDb({ sheets: [sheet()] });

    expect(await loadSheetForPrint(db, admin, id)).toBeNull();
  });

  it("returns nothing when the stored rows are damaged", async () => {
    const { db } = fakeResultDb({ sheets: [sheet({ rows: [{ page: 1 }] })] });

    expect(await loadSheetForPrint(db, admin, SHEET_ID)).toBeNull();
  });
});
