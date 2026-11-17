"use client";

import { createAcademicYear, updateAcademicYear } from "@/lib/actions";
import type { AcademicYearItem } from "@/lib/academicYears";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  academicYears: AcademicYearItem[];
};

type FormState = {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  firstSemesterStartDate: string;
  firstSemesterEndDate: string;
  secondSemesterStartDate: string;
  secondSemesterEndDate: string;
  currentSemester: "FIRST" | "SECOND";
};

const emptyFormState: FormState = {
  name: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  firstSemesterStartDate: "",
  firstSemesterEndDate: "",
  secondSemesterStartDate: "",
  secondSemesterEndDate: "",
  currentSemester: "FIRST",
};

const AcademicYearForm = ({ academicYears }: Props) => {
  const th = useTranslations("tableHeaders");
  const t = useTranslations("settings.academicYears");
  const actionsT = useTranslations("actions");
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyFormState);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedYears = useMemo(
    () =>
      [...academicYears].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [academicYears],
  );

  const onEdit = (year: AcademicYearItem) => {
    setForm({
      id: year.id,
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
      firstSemesterStartDate: year.firstSemesterStartDate ?? "",
      firstSemesterEndDate: year.firstSemesterEndDate ?? "",
      secondSemesterStartDate: year.secondSemesterStartDate ?? "",
      secondSemesterEndDate: year.secondSemesterEndDate ?? "",
      currentSemester: year.currentSemester,
    });
    setIsModalOpen(true);
  };

  const onReset = () => {
    setForm(emptyFormState);
    setIsModalOpen(false);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      const payload = {
        id: form.id,
        name: form.name,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        isCurrent: form.isCurrent,
        firstSemesterStartDate: new Date(form.firstSemesterStartDate),
        firstSemesterEndDate: new Date(form.firstSemesterEndDate),
        secondSemesterStartDate: new Date(form.secondSemesterStartDate),
        secondSemesterEndDate: new Date(form.secondSemesterEndDate),
        currentSemester: form.currentSemester,
      };

      const result = form.id
        ? await updateAcademicYear({ success: false, error: false }, payload)
        : await createAcademicYear({ success: false, error: false }, payload);

      if (result.success) {
        toast(form.id ? t("updated") : t("created"));
        onReset();
        router.refresh();
        return;
      }

      toast.error(result.message ?? actionsT("somethingWentWrong"));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-outline/80 p-6 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-outline/60">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-base md:text-lg text-content-primary tracking-tight">
              {t("title")}
            </h2>
            <p className="text-xs sm:text-sm text-content-muted">
              {t("description")}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setForm(emptyFormState);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t("add")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-outline/70 bg-surface-muted/40 text-content-muted text-start text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-start">{th("name")}</th>
                <th className="px-4 py-3 text-start">{th("range")}</th>
                <th className="px-4 py-3 text-start">{th("current")}</th>
                <th className="px-4 py-3 text-end">{th("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/60">
              {sortedYears.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-content-muted" colSpan={4}>
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                sortedYears.map((year) => (
                  <tr key={year.id} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-content-primary">{year.name}</td>
                    <td className="px-4 py-3 text-content-secondary tabular-nums">
                      {year.startDate} - {year.endDate}
                    </td>
                    <td className="px-4 py-3">
                      {year.isCurrent ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="success" size="sm" className="font-semibold">
                            {actionsT("yes")}
                          </Badge>
                          <span className="text-[11px] text-content-muted">
                            {year.currentSemester === "FIRST"
                              ? t("firstSemester")
                              : t("secondSemester")}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" size="sm">
                          {actionsT("no")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        className="p-1.5 rounded-lg text-brandPurple-600 dark:text-brandPurple-400 hover:bg-brandPurple-50 dark:hover:bg-brandPurple-950/40 transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                        type="button"
                        onClick={() => onEdit(year)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{actionsT("edit")}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onReset();
            }
          }}
        >
          <form
            className="relative bg-surface border border-outline/80 shadow-2xl p-6 rounded-2xl w-full max-w-2xl space-y-5"
            onSubmit={onSubmit}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-outline/60">
              <h3 className="font-bold text-base md:text-lg text-content-primary tracking-tight">
                {form.id ? t("editTitle") : t("add")}
              </h3>
              <button
                type="button"
                onClick={onReset}
                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
                aria-label={actionsT("close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {th("name")}
                </span>
                <input
                  type="text"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="2025/2026"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("startDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("endDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  required
                />
              </label>

              <div className="md:col-span-2 border-t border-outline/60 pt-4">
                <h4 className="font-bold text-sm text-content-primary">
                  {t("semesterDates")}
                </h4>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("firstSemesterStartDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.firstSemesterStartDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      firstSemesterStartDate: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("firstSemesterEndDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.firstSemesterEndDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      firstSemesterEndDate: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("secondSemesterStartDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.secondSemesterStartDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secondSemesterStartDate: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("secondSemesterEndDate")}
                </span>
                <input
                  type="date"
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.secondSemesterEndDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secondSemesterEndDate: e.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("currentSemester")}
                </span>
                <select
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  value={form.currentSemester}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "FIRST" || value === "SECOND") {
                      setForm((prev) => ({
                        ...prev,
                        currentSemester: value,
                      }));
                    }
                  }}
                >
                  <option value="FIRST">{t("firstSemester")}</option>
                  <option value="SECOND">{t("secondSemester")}</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2.5 pt-2 text-sm font-medium text-content-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))
                }
                className="w-4 h-4 rounded text-brandPurple-600 focus:ring-brandPurple-500 border-outline"
              />
              <span>{t("markCurrent")}</span>
            </label>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-outline/60">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onReset}
              >
                {actionsT("cancel")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
              >
                {form.id
                  ? isSubmitting
                    ? actionsT("updating")
                    : t("update")
                  : isSubmitting
                    ? actionsT("creating")
                    : t("create")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default AcademicYearForm;
