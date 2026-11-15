"use client";

import {
  createSchoolDayException,
  deleteSchoolDayException,
  updateSchoolWorkingDays,
} from "@/lib/actions";
import type { SchoolDayExceptionItem } from "@/lib/schoolSettings";
import { schoolWeekDays, type SchoolWeekDay } from "@/lib/schoolCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  initialWorkingDays: SchoolWeekDay[];
  exceptions: SchoolDayExceptionItem[];
};

const WorkingDaysHolidaysForm = ({ initialWorkingDays, exceptions }: Props) => {
  const th = useTranslations("tableHeaders");
  const t = useTranslations("settings.workingDays");
  const actionsT = useTranslations("actions");
  const router = useRouter();
  const [isSavingWorkingDays, startSavingWorkingDays] = useTransition();
  const [isSavingException, startSavingException] = useTransition();
  const [isDeletingException, startDeletingException] = useTransition();
  const [deletingExceptionId, setDeletingExceptionId] = useState<number | null>(
    null,
  );

  const [workingDays, setWorkingDays] =
    useState<SchoolWeekDay[]>(initialWorkingDays);
  const [date, setDate] = useState("");
  const [type, setType] = useState<SchoolDayExceptionItem["type"]>("HOLIDAY");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);

  const sortedExceptions = useMemo(
    () => [...exceptions].sort((a, b) => a.date.localeCompare(b.date)),
    [exceptions],
  );

  const toggleDay = (day: SchoolWeekDay) => {
    setWorkingDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }

      return schoolWeekDays.filter((d) => [...prev, day].includes(d));
    });
  };

  const onSaveWorkingDays = () => {
    startSavingWorkingDays(async () => {
      const result = await updateSchoolWorkingDays(
        { success: false, error: false },
        { workingDays },
      );

      if (result.success) {
        toast(t("workingDaysUpdated"));
        router.refresh();
        return;
      }

      toast.error(result.message ?? actionsT("somethingWentWrong"));
    });
  };

  const onCreateException = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startSavingException(async () => {
      const result = await createSchoolDayException(
        { success: false, error: false },
        { date, type, name, notes },
      );

      if (result.success) {
        toast(t("exceptionSaved"));
        setDate("");
        setType("HOLIDAY");
        setName("");
        setNotes("");
        setIsExceptionModalOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.message ?? actionsT("somethingWentWrong"));
    });
  };

  const onDeleteException = (id: number) => {
    setDeletingExceptionId(id);
    startDeletingException(async () => {
      const formData = new FormData();
      formData.set("id", String(id));

      const result = await deleteSchoolDayException(
        { success: false, error: false },
        formData,
      );

      if (result.success) {
        toast(t("exceptionRemoved"));
        setDeletingExceptionId(null);
        router.refresh();
        return;
      }

      setDeletingExceptionId(null);
      toast.error(result.message ?? actionsT("somethingWentWrong"));
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Weekly Working Days */}
      <div className="space-y-6 bg-surface border border-outline/80 p-6 rounded-2xl shadow-2xs">
        <div>
          <h3 className="font-bold text-content-primary text-base tracking-tight">
            {t("weeklyWorkingDays")}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {schoolWeekDays.map((day) => {
            const isActive = workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer",
                  isActive
                    ? "bg-brandPurple-600 text-white shadow-brandPurple-500/20 ring-2 ring-brandPurple-600/30 font-bold"
                    : "bg-surface border border-outline/80 text-content-secondary hover:text-content-primary hover:bg-surface-muted hover:border-outline"
                )}
              >
                {t(`days.${day}`)}
              </button>
            );
          })}
        </div>

        <div className="pt-4 border-t border-outline/60 flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onSaveWorkingDays}
            loading={isSavingWorkingDays}
            className="w-full sm:w-auto"
          >
            {isSavingWorkingDays ? actionsT("saving") : t("saveWorkingDays")}
          </Button>
        </div>
      </div>

      {/* Holidays & Off-Days */}
      <div className="flex flex-col gap-4 bg-surface border border-outline/80 p-6 rounded-2xl shadow-2xs">
        <div className="flex justify-between items-center pb-2 border-b border-outline/60">
          <span className="block font-bold text-content-primary text-sm tracking-tight">
            {t("holidaysOffDays")}
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsExceptionModalOpen(true)}
          >
            {t("addException")}
          </Button>
        </div>

        <div className="sm:hidden space-y-3">
          {sortedExceptions.length === 0 ? (
            <div className="px-4 py-8 text-center text-content-muted text-sm">
              {t("empty")}
            </div>
          ) : (
            sortedExceptions.map((item) => (
              <div
                key={item.id}
                className="space-y-2 p-4 border border-outline/80 rounded-xl bg-surface-muted/30"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-content-primary">{item.date}</span>
                  <Badge variant={item.type === "HOLIDAY" ? "warning" : "info"} size="sm">
                    {t(`types.${item.type}`)}
                  </Badge>
                </div>
                <p className="text-xs text-content-secondary">
                  <span className="font-semibold text-content-muted">{th("name")}:</span>{" "}
                  {item.name || "-"}
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteException(item.id)}
                  disabled={isDeletingException}
                  className="text-rose-600 text-xs font-semibold hover:underline"
                >
                  {isDeletingException && deletingExceptionId === item.id
                    ? actionsT("deleting")
                    : actionsT("delete")}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-outline/70 bg-surface-muted/40 text-content-muted text-start text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-start">{th("date")}</th>
                <th className="px-4 py-3 text-start">{th("type")}</th>
                <th className="px-4 py-3 text-start">{th("name")}</th>
                <th className="px-4 py-3 text-end">{th("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/60">
              {sortedExceptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-content-muted">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                sortedExceptions.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-content-primary">{item.date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.type === "HOLIDAY" ? "warning" : "info"} size="sm">
                        {t(`types.${item.type}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-content-secondary">{item.name || "-"}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => onDeleteException(item.id)}
                        disabled={isDeletingException}
                        className="p-1.5 rounded-lg text-content-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors inline-flex items-center gap-1"
                        title={actionsT("delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">
                          {isDeletingException && deletingExceptionId === item.id
                            ? actionsT("deleting")
                            : actionsT("delete")}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Modal */}
      {isExceptionModalOpen && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsExceptionModalOpen(false);
          }}
        >
          <div className="bg-surface border border-outline/80 shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-outline/60">
              <h3 className="font-bold text-base md:text-lg text-content-primary tracking-tight">
                {t("addException")}
              </h3>
              <button
                type="button"
                onClick={() => setIsExceptionModalOpen(false)}
                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onCreateException} className="space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {th("date")}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {th("type")}
                </span>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as SchoolDayExceptionItem["type"])
                  }
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  required
                >
                  <option value="HOLIDAY">{t("types.HOLIDAY")}</option>
                  <option value="CUSTOM_OFF">{t("types.CUSTOM_OFF")}</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {th("name")}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium placeholder:text-content-muted"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-content-secondary text-xs uppercase tracking-wider">
                  {t("notes")}
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-sm text-content-primary focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 outline-none transition-all font-medium"
                  rows={3}
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-outline/60">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsExceptionModalOpen(false)}
                >
                  {actionsT("cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSavingException}
                >
                  {isSavingException ? actionsT("saving") : actionsT("save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingDaysHolidaysForm;
