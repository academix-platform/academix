"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { mapImportColumns, readImportFile } from "@/lib/actions/peopleImport.actions";
import { PhotoTooLargeError, shrinkPhoto } from "@/lib/entrySheets/shrinkPhoto";
import {
  applyColumnMapping,
  cellText,
  describeColumns,
  fieldsFor,
  findHeaderRow,
  type ColumnChoice,
  type ImportKind,
} from "@/lib/peopleImport/columns";
import { decodeCsv, parseCsv } from "@/lib/peopleImport/csv";
import {
  IMPORT_FILE_ACCEPT,
  MAX_IMPORT_ROWS,
  MAX_PDF_PAGES,
  checkImportFile,
  readErrorProblem,
  type ImportFileProblem,
} from "@/lib/peopleImport/fileCheck";
import type { ReadFileProblem } from "@/lib/peopleImport/readFile";
import type { ReviewState } from "@/lib/peopleImport/reviewState";

type Problem = ImportFileProblem | "tooManyRows" | "noRows";

/** Why a photo or PDF wasn't read. Trying the same file again can help for some. */
type ReadProblem = Exclude<ReadFileProblem, "noRows"> | "readNoRows" | "photoOpenFailed";
const WORTH_TRYING_AGAIN: ReadonlySet<ReadProblem> = new Set(["unavailable", "unreadable", "readNoRows"]);

const PREVIEW_ROWS = 8;
const HEADER_CHOICES = 10;

/** Reads the file in the browser: nothing is uploaded or stored. */
const readRows = async (file: File, type: "xlsx" | "csv"): Promise<unknown[][]> => {
  if (type === "csv") return parseCsv(decodeCsv(new Uint8Array(await file.arrayBuffer())));
  // Source: https://gitlab.com/catamphetamine/read-excel-file/-/raw/master/README.md
  const { readSheet } = await import("read-excel-file/browser");
  return (await readSheet(file)) as unknown[][];
};

/**
 * Upload, header row and column choices for a people import. Only headers and
 * column descriptions leave the browser, when the columns are read.
 */
export default function ImportUpload({
  kind,
  onReady,
}: {
  kind: ImportKind;
  onReady: (rows: ReviewState["rows"]) => void;
}) {
  const t = useTranslations("peopleImport");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<unknown[][] | null>(null);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnChoice[] | null>(null);
  const [mappingFailed, setMappingFailed] = useState(false);
  const [busy, setBusy] = useState<"file" | "columns" | "reading" | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [readProblem, setReadProblem] = useState<ReadProblem | null>(null);
  /** The photo or PDF last sent, kept in memory only, so a failed read can be tried again. */
  const lastFile = useRef<{ file: File; type: "photo" | "pdf" } | null>(null);

  const reset = () => {
    setRows(null);
    setMapping(null);
    setMappingFailed(false);
    setProblem(null);
    setReadProblem(null);
    lastFile.current = null;
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  /** Sends a photo or PDF to be read. It isn't stored: the rows come back for review. */
  const readWithAi = async (file: File, type: "photo" | "pdf") => {
    lastFile.current = { file, type };
    setReadProblem(null);
    setBusy("reading");
    try {
      let upload: Blob = file;
      if (type === "photo") {
        try {
          upload = await shrinkPhoto(file);
        } catch (err) {
          return setReadProblem(err instanceof PhotoTooLargeError ? "tooLarge" : "photoOpenFailed");
        }
      }
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", upload, type === "photo" ? "list.jpg" : "list.pdf");
      const result = await readImportFile(formData);
      if (result.success && result.rows?.length) return onReady(result.rows);
      setReadProblem(result.problem === "noRows" ? "readNoRows" : (result.problem ?? "unavailable"));
    } catch {
      setReadProblem("unavailable");
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    const check = checkImportFile(file);
    if (!check.ok) return setProblem(check.problem);
    if (check.type === "photo" || check.type === "pdf") return readWithAi(file, check.type);
    const spreadsheet = check.type;

    setBusy("file");
    try {
      const read = (await readRows(file, spreadsheet)).filter((row) => row.some((cell) => cellText(cell) !== ""));
      if (read.length < 2) return setProblem("noRows");
      if (read.length - 1 > MAX_IMPORT_ROWS) return setProblem("tooManyRows");
      setRows(read);
      setHeaderIndex(findHeaderRow(read));
    } catch (err) {
      setProblem(readErrorProblem(err));
    } finally {
      setBusy(null);
    }
  };

  const dataRows = rows ? rows.slice(headerIndex + 1) : [];
  const header = rows ? rows[headerIndex] : [];

  const readColumns = async () => {
    if (!rows) return;
    const columns = describeColumns(header, dataRows);
    setBusy("columns");
    try {
      const result = await mapImportColumns(kind, columns);
      if (result.success && result.mapping) {
        setMapping(result.mapping);
        setMappingFailed(false);
      } else {
        setMapping(columns.map(() => "unknown"));
        setMappingFailed(true);
      }
    } catch {
      setMapping(columns.map(() => "unknown"));
      setMappingFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const finish = () => {
    if (!mapping) return;
    const imported = applyColumnMapping(dataRows, mapping, headerIndex + 2);
    if (imported.length === 0) return setProblem("noRows");
    onReady(imported);
  };

  const fields = [...fieldsFor(kind), "unknown"] as ColumnChoice[];
  const firstValue = (column: number) => cellText(dataRows.find((row) => cellText(row[column]) !== "")?.[column]);

  return (
    <div className="flex flex-col gap-6">
      {/* File */}
      <section className="flex flex-col gap-3">
        <label
          htmlFor={inputId}
          className="flex flex-col items-center gap-2 border-2 border-gray-300 hover:border-academixPurpleDark border-dashed rounded-lg p-6 text-center cursor-pointer transition focus-within:border-academixPurpleDark"
        >
          <Upload className="w-6 h-6 text-academixPurpleDark" aria-hidden="true" />
          <span className="font-semibold text-gray-800">{t("upload.label")}</span>
          <span className="text-gray-500 text-sm">{t("upload.hint")}</span>
          {fileName && (
            <span className="inline-flex items-center gap-1 text-gray-700 text-sm" dir="auto">
              <FileText className="w-4 h-4" aria-hidden="true" />
              {fileName}
            </span>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={IMPORT_FILE_ACCEPT}
            className="sr-only"
            disabled={busy !== null}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        {busy === "file" && (
          <p role="status" className="inline-flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t("upload.reading")}
          </p>
        )}
        <p className="text-gray-600 text-sm">{t("upload.photoNote", { pages: MAX_PDF_PAGES })}</p>
        {busy === "reading" && (
          <p role="status" className="inline-flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t("upload.readingWithAi")}
          </p>
        )}
        {problem && (
          <p role="alert" className="bg-red-50 p-3 border border-red-200 rounded-md text-red-800 text-sm">
            {t(`fileProblems.${problem}`, { max: MAX_IMPORT_ROWS })}
          </p>
        )}
        {readProblem && busy === null && (
          <div role="alert" className="flex flex-col gap-2 bg-red-50 p-3 border border-red-200 rounded-md text-red-800 text-sm">
            <p>{t(`readProblems.${readProblem}`, { pages: MAX_PDF_PAGES })}</p>
            <div className="flex flex-wrap gap-2">
              {WORTH_TRYING_AGAIN.has(readProblem) && (
                <button
                  type="button"
                  onClick={() => lastFile.current && readWithAi(lastFile.current.file, lastFile.current.type)}
                  className="bg-white hover:bg-red-100 px-3 py-1 border border-red-300 rounded-md font-medium"
                >
                  {t("upload.tryAgain")}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  reset();
                  inputRef.current?.click();
                }}
                className="bg-white hover:bg-red-100 px-3 py-1 border border-red-300 rounded-md font-medium"
              >
                {t("mapping.changeFile")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Header row */}
      {rows && !mapping && (
        <section className="flex flex-col gap-3" aria-labelledby={`${inputId}-header`}>
          <h2 id={`${inputId}-header`} className="font-semibold text-gray-900">
            {t("header.title")}
          </h2>
          <p className="text-gray-600 text-sm">{t("header.hint")}</p>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>{t("header.headerRow")}</span>
            <select
              value={headerIndex}
              onChange={(event) => setHeaderIndex(Number(event.target.value))}
              className="px-3 border rounded-md h-10"
            >
              {rows.slice(0, HEADER_CHOICES).map((_, index) => (
                <option key={index} value={index}>
                  {t("header.rowLabel", { number: index + 1 })}
                </option>
              ))}
            </select>
          </label>
          <div className="border rounded-md max-w-full overflow-x-auto">
            <table className="text-sm">
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((row, index) => (
                  <tr
                    key={index}
                    className={index === headerIndex ? "bg-academixPurpleLight font-semibold" : "even:bg-slate-50"}
                  >
                    <th scope="row" className="px-2 py-1 border-e text-gray-500 font-normal text-xs whitespace-nowrap">
                      {index + 1}
                    </th>
                    {row.map((cell, column) => (
                      <td key={column} className="px-2 py-1 max-w-48 truncate whitespace-nowrap" dir="auto">
                        {cellText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bg-slate-50 p-3 rounded-md text-gray-700 text-sm">{t("header.privacy")}</p>
          <div>
            <button
              type="button"
              onClick={readColumns}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md font-semibold text-white text-sm"
            >
              {busy === "columns" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {busy === "columns" ? t("header.readingColumns") : t("header.readColumns")}
            </button>
          </div>
        </section>
      )}

      {/* Column choices */}
      {rows && mapping && (
        <section className="flex flex-col gap-3" aria-labelledby={`${inputId}-mapping`}>
          <h2 id={`${inputId}-mapping`} className="font-semibold text-gray-900">
            {t("mapping.title")}
          </h2>
          <p className="text-gray-600 text-sm">{t("mapping.hint")}</p>
          {mappingFailed && (
            <p role="alert" className="bg-amber-50 p-3 border border-amber-200 rounded-md text-amber-900 text-sm">
              {t("mapping.failed")}
            </p>
          )}
          <div className="border rounded-md max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-start">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start">{t("mapping.column")}</th>
                  <th scope="col" className="px-3 py-2 text-start">{t("mapping.sample")}</th>
                  <th scope="col" className="px-3 py-2 text-start">{t("mapping.field")}</th>
                </tr>
              </thead>
              <tbody>
                {mapping.map((field, column) => {
                  const name = cellText(header[column]) || t("mapping.noHeader", { number: column + 1 });
                  return (
                    <tr key={column} className="border-t">
                      <td className="px-3 py-2 font-medium" dir="auto">{name}</td>
                      <td className="px-3 py-2 max-w-48 text-gray-600 truncate" dir="auto">{firstValue(column)}</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={`${t("mapping.field")}: ${name}`}
                          value={field}
                          onChange={(event) =>
                            setMapping(mapping.map((old, i) => (i === column ? (event.target.value as ColumnChoice) : old)))
                          }
                          className={`px-2 border rounded-md w-full min-w-40 h-9 ${field === "unknown" ? "text-gray-500" : ""}`}
                        >
                          {fields.map((option) => (
                            <option key={option} value={option}>
                              {t(`fields.${option}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={finish}
              className="bg-academixPurpleDark hover:brightness-90 px-4 py-2 rounded-md font-semibold text-white text-sm"
            >
              {t("mapping.continue")}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 text-sm"
            >
              {t("mapping.changeFile")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
