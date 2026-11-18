// The review screen's state: the file's rows as the admin edits them, their
// choices, and what saving did. Pure functions, so they can be tested.

import type { ImportedRow, PersonField } from "./columns";
import type { ReviewedStudentRow, RowDecision } from "./rowFlags";
import type { ReviewedTeacherRow } from "./teacherFlags";
import type { SaveRowInput, SaveRowResult } from "./saveBatch";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";

export type ReviewState = {
  rows: (ImportedRow & { unclear?: PersonField[] })[];
  decisions: Record<number, RowDecision>;
  outcomes: Record<number, SaveRowResult>;
};

/** A reviewed row of either kind of file. */
export type ReviewedRow = ReviewedStudentRow | ReviewedTeacherRow;

export type ReviewFilter = "all" | "needsFixing" | "ready" | "done";

const DONE: ReadonlySet<SaveRowResult["outcome"]> = new Set(["created", "updated", "unchanged"]);
const isDone = (outcome?: SaveRowResult) => outcome !== undefined && DONE.has(outcome.outcome);

export const initialReviewState = (rows: ReviewState["rows"]): ReviewState => ({ rows, decisions: {}, outcomes: {} });

const withoutOutcome = (outcomes: ReviewState["outcomes"], sourceRow: number) => {
  if (!(sourceRow in outcomes) || isDone(outcomes[sourceRow])) return outcomes;
  const { [sourceRow]: _old, ...rest } = outcomes;
  return rest;
};

/** The admin typed a value. It is no longer unclear, and an earlier failure no longer applies. */
export const editValue = (state: ReviewState, sourceRow: number, field: PersonField, value: string): ReviewState => ({
  ...state,
  rows: state.rows.map((row) => {
    if (row.sourceRow !== sourceRow) return row;
    const { [field]: _old, ...values } = row.values;
    const unclear = row.unclear?.filter((f) => f !== field);
    return {
      ...row,
      values: value.trim() ? { ...values, [field]: value } : values,
      ...(row.unclear && { unclear }),
    };
  }),
  outcomes: withoutOutcome(state.outcomes, sourceRow),
});

/** The admin made a choice for a row. "Same student" and "new student" replace each other. */
export const decide = (state: ReviewState, sourceRow: number, choice: RowDecision): ReviewState => {
  const current = { ...(state.decisions[sourceRow] ?? {}) };
  if (choice.sameAs !== undefined) delete current.asNew;
  if (choice.asNew !== undefined) delete current.sameAs;
  return {
    ...state,
    decisions: { ...state.decisions, [sourceRow]: { ...current, ...choice } },
    outcomes: withoutOutcome(state.outcomes, sourceRow),
  };
};

/** Rows still on the review screen: everything but the saved ones. */
export const rowsToReview = (state: ReviewState): SaveRowInput[] =>
  state.rows
    .filter((row) => !isDone(state.outcomes[row.sourceRow]))
    .map((row) => ({ ...row, ...(state.decisions[row.sourceRow] && { decision: state.decisions[row.sourceRow] }) }));

/** The rows to save, in batches: ready, and adding or changing someone. */
export const saveBatches = (state: ReviewState, reviewed: ReviewedRow[]): SaveRowInput[][] => {
  const ready = new Set(
    reviewed
      .filter((row) => row.canSave && (row.status === "new" || row.status === "update"))
      .map((row) => row.sourceRow),
  );
  const toSave = rowsToReview(state).filter((row) => ready.has(row.sourceRow));
  const batches: SaveRowInput[][] = [];
  for (let i = 0; i < toSave.length; i += SAVE_BATCH_SIZE) batches.push(toSave.slice(i, i + SAVE_BATCH_SIZE));
  return batches;
};

export const recordResults = (state: ReviewState, results: SaveRowResult[]): ReviewState => ({
  ...state,
  outcomes: { ...state.outcomes, ...Object.fromEntries(results.map((result) => [result.sourceRow, result])) },
});

export type DisplayStatus = ReviewedRow["status"] | "saved" | "failed";

export const displayStatus = (row: ReviewedRow, outcome: SaveRowResult | undefined): DisplayStatus =>
  isDone(outcome) ? "saved" : outcome?.outcome === "failed" ? "failed" : row.status;

export const matchesFilter = (row: ReviewedRow, outcome: SaveRowResult | undefined, filter: ReviewFilter) => {
  const status = displayStatus(row, outcome);
  if (filter === "all") return true;
  if (filter === "done") return status === "saved";
  if (filter === "needsFixing") return status === "failed" || (!row.canSave && status !== "skipped" && status !== "saved");
  return row.canSave && status !== "failed" && status !== "saved";
};
