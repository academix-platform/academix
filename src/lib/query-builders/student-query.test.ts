import { describe, expect, it } from "vitest";
import { buildStudentQuery, missingNationalIdWhere } from "./student-query";

const build = (params: Record<string, string>, role = "admin") =>
  buildStudentQuery({
    searchParams: Promise.resolve(params),
    schoolId: 1,
    currentAcademicYearId: 7,
    role,
    userId: "user_1",
  });

describe("the missing national ID filter", () => {
  it("lists only students without an ID, for admins", async () => {
    const { query } = await build({ missingNationalId: "1" });
    expect(query.AND).toEqual([{ nationalId: null }]);
    expect(query.schoolId).toBe(1);
  });

  it("is ignored for teachers", async () => {
    const { query } = await build({ missingNationalId: "1" }, "teacher");
    expect(JSON.stringify(query)).not.toContain("nationalId");
  });

  it("is off unless asked for", async () => {
    const { query, missingNationalIdOnly } = await build({});
    expect(query.AND).toBeUndefined();
    expect(missingNationalIdOnly).toBe(false);
  });

  it("tells the page when it is on", async () => {
    expect((await build({ missingNationalId: "1" })).missingNationalIdOnly).toBe(true);
    expect((await build({ missingNationalId: "1" }, "teacher")).missingNationalIdOnly).toBe(false);
  });
});

describe("missingNationalIdWhere", () => {
  it("counts the same students the filter lists, when no other filter is on", async () => {
    const { query } = await build({ missingNationalId: "1" });
    const { AND, ...base } = query;
    expect(missingNationalIdWhere(query)).toEqual({ ...base, nationalId: null });
    expect(AND).toEqual([{ nationalId: null }]);
  });

  it("keeps the status the list is showing", async () => {
    const { query } = await build({ status: "REPEATED", repeatCount: "2" });
    expect(missingNationalIdWhere(query)).toMatchObject({
      schoolId: 1,
      status: "REPEATED",
      repeatCount: 2,
      nationalId: null,
    });
  });
});
