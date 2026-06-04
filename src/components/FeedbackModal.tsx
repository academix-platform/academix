"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createFeedback } from "@/lib/actions/feedback";

export default function FeedbackModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const form = event.currentTarget;
      const result = await createFeedback(new FormData(form));

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                <h2 className="text-lg font-semibold">Submit Feedback</h2>
                <p className="text-sm text-gray-500">
                  Send a suggestion or complaint to the school administration.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Type
                </label>

                <select
                  name="type"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:bg-gray-100"
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
                  disabled={isSubmitting}
                  placeholder="Write your message..."
                  className="h-36 w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED] disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : "Send Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
