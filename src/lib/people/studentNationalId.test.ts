import { describe, expect, it } from "vitest";
import { checkStudentNationalId, type StudentIdDb } from "./studentNationalId";

type Row = { id: string; schoolId: number; nationalId: string | null };

/** Answers findFirst the way Prisma would for the filters the check uses. */
const fakeStudents = (rows: Row[]) =>
  ({
    student: {
      findFirst: async ({
        where,
      }: {
        where: { schoolId: number; nationalId: string; NOT?: { id: string } };
      }) =>
        rows.find(
          (row) =>
            row.schoolId === where.schoolId &&
            row.nationalId === where.nationalId &&
            row.id !== where.NOT?.id,
        ) ?? null,
    },
  }) as unknown as StudentIdDb;

const db = fakeStudents([
  { id: "lina", schoolId: 1, nationalId: "123456782" },
  { id: "old", schoolId: 1, nationalId: null },
  { id: "other", schoolId: 2, nationalId: "000000018" },
]);

describe("checkStudentNationalId", () => {
  it("returns the ID as 9 digits when nobody in the school has it", async () => {
    expect(await checkStudentNationalId(db, { schoolId: 1, nationalId: "18" })).toEqual({
      ok: true,
      id: "000000018",
    });
  });

  it("refuses an ID another student in the school already has", async () => {
    expect(await checkStudentNationalId(db, { schoolId: 1, nationalId: "123456782" })).toEqual({
      ok: false,
      problem: "nationalIdTaken",
    });
  });

  it("lets a student keep their own ID when they are edited", async () => {
    expect(
      await checkStudentNationalId(db, { schoolId: 1, nationalId: "123456782", studentId: "lina" }),
    ).toEqual({ ok: true, id: "123456782" });
  });

  it("refuses an empty or invalid ID before looking anyone up", async () => {
    const noLookups = { student: { findFirst: () => Promise.reject(new Error("looked up")) } };
    const check = (nationalId?: string | null) =>
      checkStudentNationalId(noLookups as unknown as StudentIdDb, { schoolId: 1, nationalId });

    expect(await check(undefined)).toEqual({ ok: false, problem: "nationalIdRequired" });
    expect(await check("")).toEqual({ ok: false, problem: "nationalIdRequired" });
    expect(await check("12a")).toEqual({ ok: false, problem: "nationalIdFormat" });
    expect(await check("123456781")).toEqual({ ok: false, problem: "nationalIdCheckDigit" });
  });
});
