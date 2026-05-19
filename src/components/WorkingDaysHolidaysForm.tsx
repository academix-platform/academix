"use client";

import {
  createSchoolDayException,
  deleteSchoolDayException,
  updateSchoolWorkingDays,
} from "@/lib/actions";
import type { SchoolDayExceptionItem } from "@/lib/schoolSettings";
import { schoolWeekDays, type SchoolWeekDay } from "@/lib/schoolCalendar";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  initialWorkingDays: SchoolWeekDay[];
  exceptions: SchoolDayExceptionItem[];
};

const dayLabels: Record<SchoolWeekDay, string> = {
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

const typeLabels: Record<SchoolDayExceptionItem["type"], string> = {
  HOLIDAY: "Holiday",
  OFF_DAY: "Off Day",
  WORKING_OVERRIDE: "Working Override",
};

const WorkingDaysHolidaysForm = ({ initialWorkingDays, exceptions }: Props) => {
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
        toast("Working days updated.");
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Something went wrong!");
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
        toast("Day exception saved.");
        setDate("");
        setType("HOLIDAY");
        setName("");
        setNotes("");
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Something went wrong!");
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
        toast("Day exception removed.");
        setDeletingExceptionId(null);
        router.refresh();
        return;
      }

      setDeletingExceptionId(null);
      toast.error(result.message ?? "Something went wrong!");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="block font-semibold text-gray-700 text-sm">
          Weekly Working Days
        </span>
        <div className="flex flex-wrap gap-2">
          {schoolWeekDays.map((day) => {
            const isActive = workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-academixPurpleLight border-academixPurpleDark text-academixPurpleDark"
                    : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                {dayLabels[day]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSaveWorkingDays}
          disabled={isSavingWorkingDays}
          className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md font-semibold text-white text-sm transition-all"
        >
          {isSavingWorkingDays ? "Saving..." : "Save Working Days"}
        </button>
      </div>

      <form
        className="flex flex-col gap-4 bg-gray-50 p-6 rounded-xl"
        onSubmit={onCreateException}
      >
        <span className="block font-semibold text-gray-700 text-sm">
          Holidays and Off Days
        </span>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-medium text-gray-700 text-sm">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-medium text-gray-700 text-sm">Type</span>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as SchoolDayExceptionItem["type"])
              }
              className="bg-white px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm"
            >
              <option value="HOLIDAY">Holiday</option>
              <option value="OFF_DAY">Off Day</option>
              <option value="WORKING_OVERRIDE">Working Override</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-medium text-gray-700 text-sm">
              Name (optional)
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm"
              placeholder="e.g. Eid Holiday"
            />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-medium text-gray-700 text-sm">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isSavingException}
          className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md w-fit font-semibold text-white text-sm transition-all"
        >
          {isSavingException ? "Adding..." : "Add"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2 font-semibold">Date</th>
              <th className="px-2 py-2 font-semibold">Type</th>
              <th className="px-2 py-2 font-semibold">Name</th>
              <th className="px-2 py-2 font-semibold">Notes</th>
              <th className="px-2 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedExceptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-gray-500">
                  No day exceptions yet.
                </td>
              </tr>
            ) : (
              sortedExceptions.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-2 py-3">{item.date}</td>
                  <td className="px-2 py-3">{typeLabels[item.type]}</td>
                  <td className="px-2 py-3">{item.name || "-"}</td>
                  <td className="px-2 py-3">{item.notes || "-"}</td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => onDeleteException(item.id)}
                      disabled={isDeletingException}
                      className="text-red-600 hover:underline"
                    >
                      {isDeletingException && deletingExceptionId === item.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkingDaysHolidaysForm;
