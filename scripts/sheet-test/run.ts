// Accuracy test for sheet reading. Sends each test photo to Gemini and compares
// the reply with the correct answers. Run it with: npm run sheet-test
//
// Put the photos and an answers.json (see answers.example.json) in
// scripts/sheet-test/photos/, which git ignores. Each sheet's "values" lists
// only the filled-in rows. Use "?" for a box the reader should flag as unclear.

import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  SheetPhotoMimeType,
  SheetReadResult,
  readSheetPhoto,
} from "@/lib/ai/geminiSheetReader";
import { parseWrittenNumber } from "@/lib/entrySheets/digits";
import {
  ExpectedRow,
  SheetComparison,
  UNCLEAR_ANSWER,
  compareSheet,
  summarizeSheets,
} from "@/lib/entrySheets/readingAccuracy";

const TOOL_DIR = path.join(process.cwd(), "scripts", "sheet-test");
const PHOTOS_DIR = path.join(TOOL_DIR, "photos");

const answersSchema = z.object({
  sheets: z
    .array(
      z.object({
        photo: z.string(),
        kind: z.enum(["RESULT", "ATTENDANCE"]),
        sheetCode: z.string(),
        pageNumber: z.number().int().positive(),
        values: z.record(z.string()),
      }),
    )
    .min(1),
});
type AnswerSheet = z.infer<typeof answersSchema>["sheets"][number];

const MIME_TYPES: Record<string, SheetPhotoMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

const mimeTypeOf = (photo: string) => {
  const mimeType = MIME_TYPES[path.extname(photo).toLowerCase()];
  if (!mimeType) throw new Error(`${photo}: unsupported photo type.`);
  return mimeType;
};

/** The names printed on the sample sheets. */
const readRoster = async (): Promise<string[]> => {
  const html = await readFile(path.join(TOOL_DIR, "sample-sheets.html"), "utf8");
  const roster = html.match(/<script id="roster"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!roster) throw new Error("sample-sheets.html has no roster.");
  return JSON.parse(roster);
};

const expectedRows = (sheet: AnswerSheet, roster: string[]): ExpectedRow[] => {
  for (const [rowNumber, value] of Object.entries(sheet.values)) {
    if (!roster[Number(rowNumber) - 1]) {
      throw new Error(`${sheet.photo}: row ${rowNumber} isn't on the sheet.`);
    }
    const isMark =
      value === "" || value === UNCLEAR_ANSWER || parseWrittenNumber(value) !== null;
    if (sheet.kind === "RESULT" && !isMark) {
      throw new Error(`${sheet.photo}: row ${rowNumber} needs a number or "?", not "${value}".`);
    }
  }
  return roster.map((name, index) => ({
    rowNumber: index + 1,
    name,
    value: sheet.values[index + 1] ?? "",
  }));
};

const headerProblems = (sheet: AnswerSheet, { reply }: SheetReadResult) => {
  if (!reply.readable) return ["photo reported as unreadable"];
  return [
    ...(reply.sheetCode === sheet.sheetCode
      ? []
      : [`sheet code read as "${reply.sheetCode}", expected "${sheet.sheetCode}"`]),
    ...(reply.pageNumber === sheet.pageNumber
      ? []
      : [`page read as ${reply.pageNumber}, expected ${sheet.pageNumber}`]),
  ];
};

const printSheet = (
  sheet: AnswerSheet,
  comparison: SheetComparison,
  seconds: number,
  result: SheetReadResult,
) => {
  const { correct, total, unclear, wrongValues, wrongRows, missedAbsences } = comparison;
  const { inputTokens, outputTokens, thoughtTokens } = result.usage;

  console.log(`\n${sheet.photo}: ${correct}/${total} correct, ${unclear} unclear`);
  console.log(
    `  ${seconds.toFixed(1)}s, tokens: ${inputTokens} in, ${outputTokens} out, ${thoughtTokens} thinking`,
  );
  for (const problem of headerProblems(sheet, result)) console.log(`  PROBLEM: ${problem}`);
  for (const wrong of wrongValues) {
    console.log(`  wrong value, row ${wrong.rowNumber}: expected "${wrong.expected}", read "${wrong.read}"`);
  }
  for (const wrong of wrongRows) {
    console.log(`  WRONG ROW ${wrong.rowNumber} (${wrong.reason}): read "${wrong.read}"`);
  }
  if (missedAbsences.length > 0) {
    console.log(`  MISSED ABSENCES, rows: ${missedAbsences.join(", ")}`);
  }
};

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;

const main = async () => {
  const answersFile = await readFile(path.join(PHOTOS_DIR, "answers.json"), "utf8");
  const { sheets } = answersSchema.parse(JSON.parse(answersFile));
  const roster = await readRoster();

  // One bad row in the answer file should stop the run before any paid calls.
  const expectedBySheet = sheets.map((sheet) => expectedRows(sheet, roster));

  const comparisons: SheetComparison[] = [];
  const reads: { seconds: number; result: SheetReadResult }[] = [];
  let failedPhotos = 0;

  for (const [index, sheet] of sheets.entries()) {
    const expected = expectedBySheet[index];
    const started = performance.now();
    try {
      const photo = await readFile(path.join(PHOTOS_DIR, sheet.photo));
      const result = await readSheetPhoto({
        photo,
        mimeType: mimeTypeOf(sheet.photo),
        kind: sheet.kind,
        rowNumbers: expected.map((row) => row.rowNumber),
      });
      const seconds = (performance.now() - started) / 1000;
      const comparison = compareSheet(sheet.kind, expected, result.reply.rows);

      comparisons.push(comparison);
      reads.push({ seconds, result });
      printSheet(sheet, comparison, seconds, result);
    } catch (error) {
      failedPhotos += 1;
      comparisons.push(compareSheet(sheet.kind, expected, []));
      console.log(`\n${sheet.photo}: FAILED: ${error instanceof Error ? error.message : error}`);
    }
  }

  const summary = summarizeSheets(comparisons);
  const mean = (pick: (usage: SheetReadResult["usage"]) => number) =>
    Math.round(average(reads.map(({ result }) => pick(result.usage))));

  console.log("\n=== Summary ===");
  console.log(`Model: ${reads[0]?.result.model ?? "unknown"}`);
  console.log(`Photos: ${sheets.length} (${failedPhotos} failed)`);
  console.log(`Accuracy: ${summary.accuracy}% (${summary.correct}/${summary.total})`);
  console.log(`Unclear: ${summary.unclear}`);
  console.log(`Wrong values: ${summary.wrongValues}`);
  console.log(`Wrong rows: ${summary.wrongRows}`);
  console.log(`Missed absences: ${summary.missedAbsences}`);
  console.log(`Average time per page: ${average(reads.map((read) => read.seconds)).toFixed(1)}s`);
  console.log(
    `Average tokens per page: ${mean((usage) => usage.inputTokens)} in, ` +
      `${mean((usage) => usage.outputTokens)} out, ` +
      `${mean((usage) => usage.thoughtTokens)} thinking`,
  );
  console.log(`Spec target met: ${summary.meetsTarget ? "yes" : "no"}`);

  if (failedPhotos > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
