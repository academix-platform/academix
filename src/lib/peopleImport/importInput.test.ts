import { describe, expect, it } from "vitest";

import { saveBatchSchema } from "./importInput";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";

const row = { sourceRow: 2, values: { studentName: "ليلى حداد", nationalId: "123456782" } };

describe("saveBatchSchema", () => {
  it("accepts rows with known fields and admin choices", () => {
    expect(saveBatchSchema.safeParse([{ ...row, unclear: ["address"], decision: { classId: 3, rejectedChanges: ["address"] } }]).success).toBe(true);
  });

  it.each([
    ["an unknown field", [{ ...row, values: { schoolId: "2" } }]],
    ["a value longer than a cell needs", [{ ...row, values: { studentName: "x".repeat(201) } }]],
    ["an extra key on a row", [{ ...row, schoolId: 2 }]],
    ["an extra key on a choice", [{ ...row, decision: { schoolId: 2 } }]],
    ["no rows", []],
    ["more rows than a batch", Array(SAVE_BATCH_SIZE + 1).fill(row)],
  ])("refuses %s", (_label, input) => {
    expect(saveBatchSchema.safeParse(input).success).toBe(false);
  });
});
