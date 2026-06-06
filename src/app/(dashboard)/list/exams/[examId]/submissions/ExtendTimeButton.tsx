"use client";

import { useState, useTransition } from "react";
import { extendTime } from "@/lib/actions/examWorkflow.actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Clock, X, Loader2 } from "lucide-react";

const QUICK_OPTIONS = [5, 10, 15, 30];

export default function ExtendTimeButton({
  submissionId,
  studentName,
}: {
  submissionId: number;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(5);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleExtend = () => {
    if (minutes < 1) {
      toast.error("Please enter at least 1 minute.");
      return;
    }

    startTransition(async () => {
      const res = await extendTime(
        { success: true, error: false },
        { submissionId, extraMinutes: minutes }
      );

      if (res.error) {
        toast.error(
          ("message" in res ? res.message : null) ?? "Failed to extend time."
        );
      } else {
        toast.success(`Added ${minutes} minute(s) for ${studentName}.`);
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Extend time"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-yellow-300 bg-yellow-50 text-yellow-600 transition hover:bg-yellow-100"
      >
        <Clock className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-yellow-100 text-yellow-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">
                    Extend Time
                  </p>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {studentName}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setMinutes(opt)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                      minutes === opt
                        ? "border-academixPurpleDark bg-academixPurpleDark text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt} min
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Custom:</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
                  className="h-9 w-20 rounded-md border border-gray-200 px-2 text-center text-sm outline-none focus:border-academixPurpleDark"
                />
                <span className="text-sm text-gray-400">minutes</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-academixPurpleDark px-4 py-2 text-sm font-medium text-white transition hover:brightness-90 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? "Extending..." : `Add ${minutes} min`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
