"use client";

import { useState } from "react";
import { createFeedback } from "@/lib/actions/feedback";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6D28D9]"
      >
        Submit Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Submit Feedback
                </h2>
                <p className="text-sm text-gray-500">
                  Send a suggestion or complaint to the school administration.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form action={createFeedback} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Type
                </label>

                <select
                  name="type"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED]"
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Message
                </label>

                <textarea
                  name="message"
                  required
                  placeholder="Write your message..."
                  className="h-36 w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6D28D9]"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}