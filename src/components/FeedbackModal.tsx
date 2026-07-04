"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { createFeedback } from "@/lib/actions/feedback";

export default function FeedbackModal() {
  const t = useTranslations("feedbackPage");
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
      toast.error(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] shadow-sm px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition"
      >
        {t("submit")}
      </button>

      {open && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 p-4">
          <div className="bg-white shadow-xl p-6 rounded-2xl w-full max-w-2xl">
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <h2 className="font-semibold text-lg">{t("submit")}</h2>
                <p className="text-gray-500 text-sm">{t("description")}</p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="disabled:opacity-60 px-3 py-1 rounded-full text-gray-600 text-sm disabled:cursor-not-allowed"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  {t("type")}
                </label>

                <select
                  name="type"
                  required
                  disabled={isSubmitting}
                  className="bg-white disabled:bg-gray-100 p-3 border border-gray-300 focus:border-[#7C3AED] rounded-lg outline-none w-full text-sm disabled:cursor-not-allowed"
                >
                  <option value="suggestion">{t("types.suggestion")}</option>
                  <option value="complaint">{t("types.complaint")}</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  {t("message")}
                </label>

                <textarea
                  name="message"
                  required
                  disabled={isSubmitting}
                  placeholder={t("messagePlaceholder")}
                  className="bg-white disabled:bg-gray-100 p-3 border border-gray-300 focus:border-[#7C3AED] rounded-lg outline-none w-full h-36 text-sm resize-none disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="bg-gray-100 hover:bg-gray-200 disabled:opacity-60 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm disabled:cursor-not-allowed"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 shadow-sm px-6 py-2.5 rounded-lg font-semibold text-white text-sm transition disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t("sending") : t("send")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
