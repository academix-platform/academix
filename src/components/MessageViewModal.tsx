"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const formatDate = (value: Date, locale: string) =>
  new Intl.DateTimeFormat(locale).format(value);

const formatTime = (value: Date, locale: string) =>
  value.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

type MessageViewModalProps = {
  message: {
    title: string;
    description: string;
    date: Date;
  };
};

const MessageViewModal = ({ message }: MessageViewModalProps) => {
  const t = useTranslations("messageView");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex justify-center items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs w-8 h-8 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        onClick={() => setOpen(true)}
        title={t("view")}
        aria-label={t("view")}
      >
        <Eye className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="top-5 absolute hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition end-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide font-medium">
                  {t("title")}
                </p>
                <h2 className="mt-1 font-bold text-slate-900 dark:text-slate-100 text-lg md:text-xl">
                  {message.title}
                </h2>
              </div>

              <div>
                <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide font-medium">
                  {t("body")}
                </p>
                <p className="mt-1 text-slate-700 dark:text-slate-300 text-sm leading-6 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {message.description}
                </p>
              </div>

              <div className="gap-4 grid grid-cols-2">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide font-medium">
                    {t("date")}
                  </p>
                  <p className="mt-1 text-slate-900 dark:text-slate-100 text-sm font-medium">
                    {formatDate(message.date, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wide font-medium">
                    {t("time")}
                  </p>
                  <p className="mt-1 text-slate-900 dark:text-slate-100 text-sm font-medium">
                    {formatTime(message.date, locale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageViewModal;
