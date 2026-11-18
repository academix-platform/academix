"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  reviewStudentImport,
  reviewTeacherImport,
  saveStudentImportBatch,
  saveTeacherImportBatch,
} from "@/lib/actions/peopleImport.actions";
import type { ImportKind } from "@/lib/peopleImport/columns";
import {
  decide,
  displayStatus,
  editValue,
  initialReviewState,
  matchesFilter,
  recordResults,
  rowsToReview,
  saveBatches,
  type ReviewFilter,
  type ReviewState,
  type ReviewedRow,
} from "@/lib/peopleImport/reviewState";
import type { Login, SaveRowResult } from "@/lib/peopleImport/saveBatch";
import type { SubjectLabel } from "@/lib/peopleImport/teacherFlags";

import ReviewRow from "./ReviewRow";

const PAGE_SIZE = 50;
const RECHECK_DELAY_MS = 500;
const FILTERS: ReviewFilter[] = ["needsFixing", "ready", "done", "all"];

/**
 * Every row of the file, checked against the school on the server, to fix,
 * skip or accept before saving. Rows are saved in batches, and failed rows
 * stay here with their reasons.
 */
export default function ReviewTable({
  kind,
  initialRows,
  onLogins,
}: {
  kind: ImportKind;
  initialRows: ReviewState["rows"];
  onLogins: (logins: Login[]) => void;
}) {
  const t = useTranslations("peopleImport.review");
  const [state, setState] = useState(() => initialReviewState(initialRows));
  const [reviews, setReviews] = useState<Map<number, ReviewedRow>>(new Map());
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [subjects, setSubjects] = useState<SubjectLabel[]>([]);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [page, setPage] = useState(1);
  const latest = useRef(0);

  // Check the rows again after each edit or choice, once the admin pauses.
  const toReview = useMemo(() => rowsToReview(state), [state]);
  const check = useCallback(async () => {
    const run = ++latest.current;
    if (toReview.length === 0) return setChecking(false);
    setChecking(true);
    setCheckFailed(false);
    try {
      const result: {
        success: boolean;
        rows?: ReviewedRow[];
        classes?: { id: number; name: string }[];
        subjects?: SubjectLabel[];
      } =
        kind === "students" ? await reviewStudentImport(toReview) : await reviewTeacherImport(toReview);
      if (run !== latest.current) return;
      if (!result.success || !result.rows) throw new Error("review failed");
      const checked = result.rows;
      setReviews((old) => new Map([...old, ...checked.map((row) => [row.sourceRow, row] as const)]));
      setClasses(result.classes ?? []);
      setSubjects(result.subjects ?? []);
    } catch {
      if (run === latest.current) setCheckFailed(true);
    } finally {
      if (run === latest.current) setChecking(false);
    }
  }, [kind, toReview]);

  useEffect(() => {
    const timer = setTimeout(check, RECHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [check]);

  const rows = state.rows.flatMap((raw) => {
    const review = reviews.get(raw.sourceRow);
    return review ? [{ raw, review, outcome: state.outcomes[raw.sourceRow] }] : [];
  });
  const counts = Object.fromEntries(
    FILTERS.map((name) => [name, rows.filter((row) => matchesFilter(row.review, row.outcome, name)).length]),
  ) as Record<ReviewFilter, number>;
  const shown = rows.filter((row) => matchesFilter(row.review, row.outcome, filter));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pendingReviews = toReview.flatMap((row) => reviews.get(row.sourceRow) ?? []);
  const batches = checking || checkFailed ? [] : saveBatches(state, pendingReviews);
  const readyCount = batches.flat().length;
  const saving = progress !== null;

  const save = async () => {
    const total = batches.flat().length;
    let done = 0;
    let current = state;
    setProgress({ done, total });
    for (const batch of batches) {
      let results: SaveRowResult[];
      try {
        const reply = kind === "students" ? await saveStudentImportBatch(batch) : await saveTeacherImportBatch(batch);
        results = reply.success && reply.results
          ? reply.results
          : batch.map((row) => ({ sourceRow: row.sourceRow, outcome: "failed" as const, reasons: ["saveFailed" as const], logins: [] }));
      } catch {
        results = batch.map((row) => ({ sourceRow: row.sourceRow, outcome: "failed" as const, reasons: ["saveFailed" as const], logins: [] }));
      }
      onLogins(results.flatMap((result) => result.logins));
      current = recordResults(current, results);
      setState(current);
      done += batch.length;
      setProgress({ done, total });
    }
    setProgress(null);
    setFilter("needsFixing");
    setPage(1);
  };

  const savedCount = rows.filter((row) => displayStatus(row.review, row.outcome) === "saved").length;
  const failedCount = rows.filter((row) => row.outcome?.outcome === "failed").length;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="review-title">
      <div className="flex flex-col gap-1">
        <h2 id="review-title" className="font-semibold text-gray-900">{t("title")}</h2>
        <p className="text-gray-600 text-sm">{t("hint")}</p>
      </div>

      {/* Filters */}
      <div role="group" aria-label={t("filters.label")} className="flex flex-wrap gap-2">
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => {
              setFilter(name);
              setPage(1);
            }}
            className={`px-3 h-9 rounded-md border text-sm ${filter === name ? "bg-academixPurpleDark border-academixPurpleDark text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            {t(`filters.${name}`, { count: counts[name] })}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="text-sm">
        {checking && (
          <p className="inline-flex items-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t("checking")}
          </p>
        )}
        {checkFailed && (
          <p role="alert" className="flex flex-wrap items-center gap-2 text-red-800">
            {t("checkFailed")}
            <button type="button" onClick={check} className="underline">
              {t("tryAgain")}
            </button>
          </p>
        )}
        {savedCount + failedCount > 0 && !saving && (
          <p className="text-gray-700">{t("savedSummary", { saved: savedCount, failed: failedCount })}</p>
        )}
      </div>

      {/* Rows */}
      {pageRows.length === 0 && !checking ? (
        <p className="py-8 text-gray-500 text-center">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pageRows.map(({ raw, review, outcome }) => (
            <ReviewRow
              key={raw.sourceRow}
              kind={kind}
              raw={raw}
              review={review}
              outcome={outcome}
              status={displayStatus(review, outcome)}
              decision={state.decisions[raw.sourceRow]}
              classes={classes}
              subjects={subjects}
              disabled={saving}
              onEdit={(field, value) => setState((old) => editValue(old, raw.sourceRow, field, value))}
              onDecide={(choice) => setState((old) => decide(old, raw.sourceRow, choice))}
            />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex justify-between items-center text-sm" aria-label={t("page", { page: currentPage, pages })}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="disabled:opacity-40 px-3 py-1 border rounded-md"
          >
            {t("previous")}
          </button>
          <span>{t("page", { page: currentPage, pages })}</span>
          <button
            type="button"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
            className="disabled:opacity-40 px-3 py-1 border rounded-md"
          >
            {t("next")}
          </button>
        </nav>
      )}

      {/* Saving */}
      <div className="bottom-0 sticky flex flex-col gap-2 bg-white py-3 border-t">
        {progress && (
          <div className="flex flex-col gap-1">
            <div
              role="progressbar"
              aria-label={t("progress")}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              className="bg-gray-100 rounded-full h-2 overflow-hidden"
            >
              <div
                className="bg-academixPurpleDark h-full transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-gray-600 text-sm">{t("saving", { done: progress.done, total: progress.total })}</p>
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={save}
            disabled={saving || readyCount === 0}
            className="inline-flex items-center gap-2 bg-academixPurpleDark disabled:opacity-50 hover:brightness-90 px-5 py-2 rounded-md font-semibold text-white"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {readyCount > 0 || saving ? t("save", { count: readyCount }) : t("nothingToSave")}
          </button>
        </div>
      </div>
    </section>
  );
}
