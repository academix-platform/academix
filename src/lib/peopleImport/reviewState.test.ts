import { describe, expect, it } from "vitest";

import type { ReviewedStudentRow } from "./rowFlags";
import type { SaveRowResult } from "./saveBatch";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";
import {
  decide,
  displayStatus,
  editValue,
  initialReviewState,
  matchesFilter,
  recordResults,
  rowsToReview,
  saveBatches,
} from "./reviewState";

const imported = (sourceRow: number, values: Record<string, string> = { studentName: `name ${sourceRow}` }) => ({
  sourceRow,
  values,
});
const reviewed = (sourceRow: number, fields: Partial<ReviewedStudentRow> = {}): ReviewedStudentRow => ({
  sourceRow,
  student: {},
  status: "new",
  changes: [],
  parent: { status: "none" },
  flags: [],
  canSave: true,
  ...fields,
});
const result = (sourceRow: number, outcome: SaveRowResult["outcome"], reasons: SaveRowResult["reasons"] = []): SaveRowResult => ({
  sourceRow,
  outcome,
  reasons,
  logins: [],
});

describe("editValue", () => {
  it("changes the value and clears the field's unclear mark", () => {
    const state = initialReviewState([{ ...imported(2), unclear: ["nationalId", "sex"] }]);

    const edited = editValue(state, 2, "nationalId", "123456782");

    expect(edited.rows[0]).toEqual({ sourceRow: 2, values: { studentName: "name 2", nationalId: "123456782" }, unclear: ["sex"] });
  });

  it("removes a value cleared to nothing", () => {
    const state = initialReviewState([imported(2, { studentName: "x", address: "غزة" })]);
    expect(editValue(state, 2, "address", "  ").rows[0].values).toEqual({ studentName: "x" });
  });

  it("leaves other rows alone", () => {
    const state = initialReviewState([imported(2), imported(3)]);
    expect(editValue(state, 2, "address", "غزة").rows[1]).toBe(state.rows[1]);
  });
});

describe("decide", () => {
  it("adds to the row's choices", () => {
    const state = decide(decide(initialReviewState([imported(2)]), 2, { classId: 4 }), 2, { skip: true });
    expect(state.decisions[2]).toEqual({ classId: 4, skip: true });
  });

  it("makes 'same student' and 'new student' replace each other", () => {
    let state = decide(initialReviewState([imported(2)]), 2, { sameAs: "old" });
    state = decide(state, 2, { asNew: true });
    expect(state.decisions[2]).toEqual({ asNew: true });
    state = decide(state, 2, { sameAs: "old" });
    expect(state.decisions[2]).toEqual({ sameAs: "old" });
  });
});

describe("saveBatches", () => {
  it("sends only rows ready to save that would add or change someone, in batches", () => {
    const rows = Array.from({ length: 25 }, (_, i) => imported(i + 2));
    const state = decide(initialReviewState(rows), 3, { classId: 1 });
    const review = rows.map((row) =>
      row.sourceRow === 4
        ? reviewed(4, { canSave: false })
        : row.sourceRow === 5
          ? reviewed(5, { status: "noChanges" })
          : reviewed(row.sourceRow),
    );

    const batches = saveBatches(state, review);

    expect(batches.map((batch) => batch.length)).toEqual([SAVE_BATCH_SIZE, SAVE_BATCH_SIZE, 3]);
    expect(batches.flat().map((row) => row.sourceRow)).not.toContain(4);
    expect(batches.flat().map((row) => row.sourceRow)).not.toContain(5);
    expect(batches[0][1]).toEqual({ ...imported(3), decision: { classId: 1 } });
  });

  it("doesn't send a row again once it's saved", () => {
    const state = recordResults(initialReviewState([imported(2), imported(3)]), [result(2, "created")]);
    expect(saveBatches(state, [reviewed(2), reviewed(3)]).flat().map((row) => row.sourceRow)).toEqual([3]);
  });
});

describe("after saving", () => {
  it("stops reviewing saved rows, and keeps failed rows to fix and save again", () => {
    const state = recordResults(initialReviewState([imported(2), imported(3), imported(4)]), [
      result(2, "created"),
      result(3, "failed", ["classFull"]),
      result(4, "unchanged"),
    ]);

    expect(rowsToReview(state).map((row) => row.sourceRow)).toEqual([3]);
    expect(displayStatus(reviewed(2), state.outcomes[2])).toBe("saved");
    expect(displayStatus(reviewed(3), state.outcomes[3])).toBe("failed");
    expect(displayStatus(reviewed(5), undefined)).toBe("new");
  });

  it("forgets a failure once the row is edited, so it shows its new review", () => {
    const failed = recordResults(initialReviewState([imported(3)]), [result(3, "failed", ["classFull"])]);
    expect(editValue(failed, 3, "className", "السابع ب").outcomes[3]).toBeUndefined();
  });
});

describe("matchesFilter", () => {
  it("sorts rows into those to fix, those ready, and those done", () => {
    const toFix = reviewed(2, { canSave: false });
    const ready = reviewed(3);
    const skipped = reviewed(4, { status: "skipped", canSave: false });
    expect(matchesFilter(toFix, undefined, "needsFixing")).toBe(true);
    expect(matchesFilter(ready, undefined, "needsFixing")).toBe(false);
    expect(matchesFilter(skipped, undefined, "needsFixing")).toBe(false);
    expect(matchesFilter(ready, undefined, "ready")).toBe(true);
    expect(matchesFilter(ready, result(3, "failed", ["saveFailed"]), "needsFixing")).toBe(true);
    expect(matchesFilter(ready, result(3, "created"), "done")).toBe(true);
    expect(matchesFilter(toFix, undefined, "all")).toBe(true);
  });
});
