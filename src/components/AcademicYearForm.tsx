"use client";

import { createAcademicYear, updateAcademicYear } from "@/lib/actions";
import type { AcademicYearItem } from "@/lib/academicYears";
import { useRouter } from "next/navigation";
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
};

const emptyFormState: FormState = {
  name: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
};

const AcademicYearForm = ({ academicYears }: Props) => {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyFormState);

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
    });
  };

  const onReset = () => {
    setForm(emptyFormState);
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
      };

      const result = form.id
        ? await updateAcademicYear({ success: false, error: false }, payload)
        : await createAcademicYear({ success: false, error: false }, payload);

      if (result.success) {
        toast(form.id ? "Academic year updated." : "Academic year created.");
        onReset();
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Something went wrong!");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="font-medium text-gray-600 text-sm">Name</span>
            <input
              type="text"
              className="p-2 rounded-md ring-[1.5px] ring-gray-300 text-sm"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="2025/2026"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium text-gray-600 text-sm">
              Start Date
            </span>
            <input
              type="date"
              className="p-2 rounded-md ring-[1.5px] ring-gray-300 text-sm"
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium text-gray-600 text-sm">End Date</span>
            <input
              type="date"
              className="p-2 rounded-md ring-[1.5px] ring-gray-300 text-sm"
              value={form.endDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, endDate: e.target.value }))
              }
              required
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))
            }
          />
          Mark as current academic year
        </label>

        <div className="flex gap-3">
          <button
            className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md w-fit text-white transition-all"
            disabled={isSubmitting}
            type="submit"
          >
            {form.id
              ? isSubmitting
                ? "Updating..."
                : "Update Academic Year"
              : isSubmitting
                ? "Creating..."
                : "Create Academic Year"}
          </button>

          {form.id ? (
            <button
              className="px-4 py-2 border border-gray-300 rounded-md w-fit text-gray-700"
              type="button"
              onClick={onReset}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2 font-semibold">Name</th>
              <th className="px-2 py-2 font-semibold">Range</th>
              <th className="px-2 py-2 font-semibold">Current</th>
              <th className="px-2 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedYears.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-gray-500" colSpan={4}>
                  No academic years yet.
                </td>
              </tr>
            ) : (
              sortedYears.map((year) => (
                <tr key={year.id} className="border-b">
                  <td className="px-2 py-3">{year.name}</td>
                  <td className="px-2 py-3">
                    {year.startDate} - {year.endDate}
                  </td>
                  <td className="px-2 py-3">{year.isCurrent ? "Yes" : "No"}</td>
                  <td className="px-2 py-3">
                    <button
                      className="text-academixPurpleDark hover:underline"
                      type="button"
                      onClick={() => onEdit(year)}
                    >
                      Edit
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

export default AcademicYearForm;
