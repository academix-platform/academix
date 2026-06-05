"use client";

import { BookOpen, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TakeExamConfirmationProps = {
  examId: number;
  title: string;
  instructions?: string | null;
};

export default function TakeExamConfirmation({
  examId,
  title,
  instructions,
}: TakeExamConfirmationProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const trimmedInstructions = instructions?.trim();

  const handleStart = () => {
    setIsStarting(true);
    router.push(`/list/exams/${examId}/take`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-academixPurpleDark hover:opacity-90 px-3 py-2 rounded-md font-semibold text-white text-xs hover:scale-[1.05] transition"
      >
        Take Exam
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-academixPurpleLight text-academixPurpleDark">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400">
                    Ready to start?
                  </p>
                  <h2 className="text-base font-semibold text-gray-900">
                    {title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {trimmedInstructions ? (
                <div className="rounded-md border border-academixPurpleDark/10 bg-academixPurpleLight p-3">
                  <p className="mb-2 text-sm font-semibold text-academixPurpleDark">
                    Instructions
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {trimmedInstructions}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No special instructions were added for this exam.
                </p>
              )}

              <p className="text-xs text-gray-400">
                Once you continue, the exam session will open.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting}
                className="inline-flex items-center gap-2 rounded-md bg-academixPurpleDark px-4 py-2 text-sm font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isStarting ? "Starting..." : "Start Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
