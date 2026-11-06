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
        className="flex justify-center items-center bg-academixPurpleDark p-2 rounded-md text-white hover:scale-[1.05] transition"
        onClick={() => setOpen(true)}
        aria-label={t("view")}
      >
        <Eye className="w-4 h-4" />
      </button>

      {open && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 p-4">
          <div className="relative bg-white shadow-lg p-5 rounded-md w-full max-w-lg">
            <button
              type="button"
              className="top-4 end-4 absolute text-gray-500 hover:text-gray-800"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  {t("title")}
                </p>
                <h2 className="mt-1 font-semibold text-gray-900 text-xl">
                  {message.title}
                </h2>
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  {t("body")}
                </p>
                <p className="mt-1 text-gray-700 text-sm leading-6 whitespace-pre-wrap">
                  {message.description}
                </p>
              </div>

              <div className="gap-4 grid grid-cols-2">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {t("date")}
                  </p>
                  <p className="mt-1 text-gray-900 text-sm">
                    {formatDate(message.date, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">
                    {t("time")}
                  </p>
                  <p className="mt-1 text-gray-900 text-sm">
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
