"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import { fieldsFor, type ImportKind, type PersonField } from "@/lib/peopleImport/columns";
import type { DisplayStatus, ReviewState, ReviewedRow } from "@/lib/peopleImport/reviewState";
import type { RowDecision, RowFlag } from "@/lib/peopleImport/rowFlags";
import type { SubjectLabel, TeacherRowFlag } from "@/lib/peopleImport/teacherFlags";
import type { SaveRowResult } from "@/lib/peopleImport/saveBatch";

const STATUS_STYLES: Record<DisplayStatus, string> = {
  new: "bg-sky-50 text-sky-800 border-sky-200",
  update: "bg-amber-50 text-amber-900 border-amber-200",
  noChanges: "bg-slate-50 text-slate-700 border-slate-200",
  skipped: "bg-slate-50 text-slate-500 border-slate-200",
  saved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-red-50 text-red-800 border-red-200",
};

type AnyFlag = RowFlag | TeacherRowFlag;

/** Every flag but the missing-optional warning stops a row from being saved. */
const isBlocking = (flag: AnyFlag) => flag.kind !== "missingOptional";

const LTR_FIELDS: ReadonlySet<PersonField> = new Set(["nationalId", "studentPhone", "parentPhone", "phone", "studentEmail", "parentEmail", "email"]);
const NUMERIC_FIELDS: ReadonlySet<PersonField> = new Set(["nationalId", "studentPhone", "parentPhone", "phone"]);

/** Fields a flag asks the admin to fix, shown as inputs without opening Edit. */
const fieldsToFix = (flags: AnyFlag[]): PersonField[] =>
  flags.flatMap((flag) => {
    if (flag.kind === "requiredMissing") return flag.fields.filter((field) => field !== "className");
    if (flag.kind === "unclear") return flag.fields;
    if (flag.kind === "invalidNationalId") return ["nationalId"];
    if (flag.kind === "noContact") return ["email", "phone"];
    if (flag.kind === "contactTaken") return flag.fields;
    return [];
  });

type Props = {
  kind: ImportKind;
  review: ReviewedRow;
  raw: ReviewState["rows"][number];
  decision?: RowDecision;
  outcome?: SaveRowResult;
  status: DisplayStatus;
  classes: { id: number; name: string }[];
  /** The school's subjects, to choose from for a teacher's unknown subject. */
  subjects: SubjectLabel[];
  disabled: boolean;
  onEdit: (field: PersonField, value: string) => void;
  onDecide: (choice: RowDecision) => void;
};

export default function ReviewRow({ kind, review, raw, decision, outcome, status, classes, subjects, disabled, onEdit, onDecide }: Props) {
  const t = useTranslations("peopleImport");
  const locale = useLocale();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const list = (fields: PersonField[]) =>
    new Intl.ListFormat(locale, { type: "conjunction" }).format(fields.map((field) => t(`fields.${field}`)));

  const shownValue = (field: PersonField, value: string) => {
    if (!value) return t("review.emptyValue");
    if (field === "sex") return value === "MALE" ? t("review.male") : value === "FEMALE" ? t("review.female") : value;
    return value;
  };

  const flags: AnyFlag[] = review.flags;
  const inputFields = editing ? fieldsFor(kind) : [...new Set(fieldsToFix(flags))];
  const parent = "parent" in review ? review.parent : undefined;
  const rowSubjects = "subjects" in review ? review.subjects : [];
  const subjectName = (subject: SubjectLabel) => t("review.subjectLabel", { name: subject.name, level: subject.level });
  /** Picks a subject for one written in the file, removes it (null), or clears the choice (undefined). */
  const chooseSubject = (text: string, choice: number | null | undefined) => {
    const { [text]: _old, ...others } = decision?.subjectChoices ?? {};
    onDecide({ subjectChoices: choice === undefined ? others : { ...others, [text]: choice } });
  };
  const skipped = review.status === "skipped";
  const blocking = flags.filter(isBlocking);
  const warnings = flags.filter((flag) => !isBlocking(flag));

  const flagText = (flag: AnyFlag) => {
    switch (flag.kind) {
      case "requiredMissing":
        return t("review.flags.requiredMissing", { fields: list(flag.fields) });
      case "invalidNationalId":
        return t(flag.reason === "format" ? "review.flags.invalidNationalIdFormat" : "review.flags.invalidNationalIdCheckDigit");
      case "unclear":
        return t("review.flags.unclear", { fields: list(flag.fields) });
      case "unknownClass":
        return t("review.flags.unknownClass");
      case "duplicateInFile":
        return t(kind === "students" ? "review.flags.duplicateInFile" : "review.flags.duplicateTeacher", { rows: flag.otherRows.join(", ") });
      case "unknownSubject":
        return t("review.flags.unknownSubject");
      case "subjectWithoutClasses":
        return t("review.flags.subjectWithoutClasses");
      case "noContact":
        return t("review.flags.noContact");
      case "contactTaken":
        return t("review.flags.contactTaken", { fields: list(flag.fields) });
      case "maybeSameStudent":
        return t("review.flags.maybeSameStudent");
      case "missingOptional":
        return t("review.flags.missingOptional", { fields: list(flag.fields) });
    }
  };

  return (
    <li className={`flex flex-col gap-3 p-4 border rounded-lg ${status === "failed" || blocking.length ? "border-red-200" : "border-gray-200"} ${skipped ? "opacity-70" : ""}`}>
      {/* Who */}
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-gray-500 text-xs">{t("review.rowNumber", { number: raw.sourceRow })}</span>
          <span className="font-semibold text-gray-900 break-words" dir="auto">
            {(kind === "students" ? raw.values.studentName : raw.values.teacherName) || t("review.noName")}
          </span>
          {kind === "students" ? (
            <span className="text-gray-600 text-sm" dir="auto">{raw.values.className}</span>
          ) : (
            <span className="text-gray-600 text-sm break-all" dir="ltr">
              {[raw.values.email, raw.values.phone].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 border rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
          {t(`review.status.${status}`)}
        </span>
      </div>

      {/* The ID, large, so it is easy to compare with the file. */}
      {kind === "students" && (
        <div className="flex items-baseline gap-2">
          <span className="text-gray-500 text-xs">{t("review.nationalId")}</span>
          <span className="font-mono text-lg tracking-widest" dir="ltr">
            {raw.values.nationalId || "—"}
          </span>
        </div>
      )}

      {/* What is wrong */}
      {!skipped && blocking.length > 0 && (
        <ul className="flex flex-col gap-2">
          {blocking.map((flag) => (
            <li key={flag.kind} className="flex flex-col gap-2 text-red-800 text-sm">
              <span className="inline-flex items-start gap-1">
                <XCircle className="mt-0.5 w-4 h-4 shrink-0" aria-hidden="true" />
                {flagText(flag)}
              </span>
              {flag.kind === "unknownClass" && (
                <select
                  aria-label={t("review.flags.chooseClass")}
                  value={decision?.classId ?? ""}
                  disabled={disabled}
                  onChange={(event) => onDecide({ classId: Number(event.target.value) || undefined })}
                  className="px-2 border rounded-md max-w-xs h-9 text-gray-900"
                >
                  <option value="">{t("review.flags.chooseClass")}</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              )}
              {flag.kind === "unknownSubject" && (
                <ul className="flex flex-col gap-2 text-gray-900">
                  {flag.subjects.map((unknown) => (
                    <li key={unknown.text} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" dir="auto">{unknown.text}</span>
                      <select
                        aria-label={`${t("review.flags.chooseSubject")}: ${unknown.text}`}
                        value={decision?.subjectChoices?.[unknown.text] ?? ""}
                        disabled={disabled}
                        onChange={(event) => chooseSubject(unknown.text, Number(event.target.value) || undefined)}
                        className="px-2 border rounded-md max-w-xs h-9"
                      >
                        <option value="">{t("review.flags.chooseSubject")}</option>
                        {(unknown.candidates.length ? unknown.candidates : subjects).map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subjectName(subject)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => chooseSubject(unknown.text, null)}
                        className="px-3 border border-gray-300 hover:bg-gray-50 rounded-md h-9 text-gray-700"
                      >
                        {t("review.flags.removeSubject")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {flag.kind === "subjectWithoutClasses" && (
                <ul className="flex flex-col gap-2 text-gray-900">
                  {flag.subjects.map((subject) => (
                    <li key={subject.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" dir="auto">{subjectName(subject)}</span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => chooseSubject(subject.text, null)}
                        className="px-3 border border-gray-300 hover:bg-gray-50 rounded-md h-9 text-gray-700"
                      >
                        {t("review.flags.removeSubject")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {flag.kind === "maybeSameStudent" && (
                <fieldset className="flex flex-col gap-1 text-gray-900">
                  <legend className="sr-only">{t("review.flags.maybeSameStudent")}</legend>
                  {flag.candidates.map((candidate) => (
                    <label key={candidate.id} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${id}-same`}
                        checked={decision?.sameAs === candidate.id}
                        disabled={disabled}
                        onChange={() => onDecide({ sameAs: candidate.id })}
                      />
                      <span dir="auto">{t("review.flags.sameStudent", { name: candidate.name, className: candidate.className })}</span>
                    </label>
                  ))}
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${id}-same`}
                      checked={decision?.asNew === true}
                      disabled={disabled}
                      onChange={() => onDecide({ asNew: true })}
                    />
                    {t("review.flags.newStudent")}
                  </label>
                </fieldset>
              )}
            </li>
          ))}
        </ul>
      )}
      {!skipped && warnings.map((flag) => (
        <p key={flag.kind} className="inline-flex items-start gap-1 text-amber-800 text-sm">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" aria-hidden="true" />
          {flagText(flag)}
        </p>
      ))}
      {outcome?.outcome === "failed" && (
        <ul role="alert" className="flex flex-col gap-1 bg-red-50 p-2 rounded-md text-red-800 text-sm">
          {outcome.reasons.map((reason) => (
            <li key={reason}>{t(`review.reasons.${reason}`)}</li>
          ))}
        </ul>
      )}

      {/* What would change */}
      {review.changes.length > 0 && (
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium text-gray-800">{t("review.changes")}</legend>
          {review.changes.map((change) => (
            <label key={change.field} className="inline-flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={change.accepted}
                disabled={disabled}
                aria-label={`${t("review.keepChange")}: ${t(`fields.${change.field}`)}`}
                onChange={(event) => {
                  const rejected = new Set(decision?.rejectedChanges ?? []);
                  if (event.target.checked) rejected.delete(change.field);
                  else rejected.add(change.field);
                  onDecide({ rejectedChanges: [...rejected] });
                }}
              />
              <span className="font-medium">{t(`fields.${change.field}`)}:</span>
              <span dir="auto" className={change.accepted ? "" : "line-through text-gray-400"}>
                {t("review.change", { from: shownValue(change.field, change.from), to: shownValue(change.field, change.to) })}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {rowSubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-800">{t("fields.subjects")}:</span>
          <ul className="flex flex-wrap gap-1">
            {rowSubjects.map((subject) => (
              <li key={subject.id} className="bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-full text-gray-800" dir="auto">
                {subjectName(subject)}
                {review.existingId && subject.isNew && <span className="text-amber-800"> · {t("review.subjectNew")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {parent?.status === "existing" && (
        <p className="inline-flex items-center gap-1 text-gray-700 text-sm">
          <Info className="w-4 h-4" aria-hidden="true" />
          <span dir="auto">{t("review.parentExisting", { name: raw.values.parentName ?? "" })}</span>
        </p>
      )}
      {parent?.status === "new" && (
        <p className="inline-flex items-center gap-1 text-gray-700 text-sm">
          <Info className="w-4 h-4" aria-hidden="true" />
          <span dir="auto">{t("review.parentNew", { name: parent.name, phone: parent.phone })}</span>
        </p>
      )}
      {status === "saved" && (
        <p className="inline-flex items-center gap-1 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          {t("review.status.saved")}
        </p>
      )}

      {/* Fixing */}
      {status !== "saved" && !skipped && inputFields.length > 0 && (
        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {inputFields.map((field) => (
            <label key={field} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">{t(`fields.${field}`)}</span>
              {field === "sex" ? (
                <select
                  value={raw.values.sex ?? ""}
                  disabled={disabled}
                  onChange={(event) => onEdit("sex", event.target.value)}
                  className="px-2 border rounded-md h-9"
                >
                  <option value="">—</option>
                  <option value="male">{t("review.male")}</option>
                  <option value="female">{t("review.female")}</option>
                  {raw.values.sex && !["male", "female"].includes(raw.values.sex) && (
                    <option value={raw.values.sex}>{raw.values.sex}</option>
                  )}
                </select>
              ) : (
                <span className="flex gap-2">
                <input
                  value={raw.values[field] ?? ""}
                  disabled={disabled}
                  onChange={(event) => onEdit(field, event.target.value)}
                  dir={LTR_FIELDS.has(field) ? "ltr" : "auto"}
                  inputMode={NUMERIC_FIELDS.has(field) ? "numeric" : undefined}
                  className="flex-1 px-2 border rounded-md min-w-0 h-9"
                />
                {raw.unclear?.includes(field) && raw.values[field] && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(field, raw.values[field] ?? "")}
                    className="px-2 border border-gray-300 hover:bg-gray-50 rounded-md h-9 text-gray-700 whitespace-nowrap"
                  >
                    {t("review.confirmValue")}
                  </button>
                )}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {status !== "saved" && (
        <div className="flex flex-wrap gap-2">
          {!skipped && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setEditing((open) => !open)}
              className="px-3 py-1 border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 text-sm"
              aria-expanded={editing}
            >
              {editing ? t("review.closeEdit") : t("review.edit")}
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecide({ skip: !skipped })}
            className="px-3 py-1 border border-gray-300 hover:bg-gray-50 rounded-md text-gray-700 text-sm"
          >
            {skipped ? t("review.include") : t("review.skip")}
          </button>
        </div>
      )}
    </li>
  );
}
