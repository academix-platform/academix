"use client";

import React, {
  Dispatch,
  SetStateAction,
  useState,
  useTransition,
} from "react";
import { createMessage } from "@/lib/actions/message.actions";
import type { MessageSchema } from "@/lib/formValidationSchemas";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type DirectMessageModalProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  userType: "student" | "parent" | "teacher";
  userId: string;
  userName: string;
};

export default function DirectMessageModal({
  open,
  setOpen,
  userType,
  userId,
  userName,
}: DirectMessageModalProps) {
  const router = useRouter();
  const t = useTranslations("directMessage");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError(t("titleMessageRequired"));
      return;
    }

    startTransition(async () => {
      try {
        const payload: MessageSchema = {
          title,
          description,
          date: new Date(),
          classIds: [],
          studentIds: [],
          parentIds: [],
          teacherIds: [],
        };

        // Add recipient based on user type
        if (userType === "student") {
          payload.studentIds = [userId];
        } else if (userType === "parent") {
          payload.parentIds = [userId];
        } else if (userType === "teacher") {
          payload.teacherIds = [userId];
        }

        const result = await createMessage(
          { success: false, error: false },
          payload,
        );

        if (result.success) {
          toast.success(t("sentTo", { name: userName }));
          setTitle("");
          setDescription("");
          setOpen(false);
          router.refresh();
        } else {
          const message = result.message || t("sendFailed");
          setError(message);
          toast.error(message);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("errorOccurred");
        setError(message);
        toast.error(message);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="relative bg-white shadow-xl p-6 rounded-xl w-full max-w-xl">
        <button
          onClick={() => setOpen(false)}
          className="top-4 end-4 absolute text-gray-400 hover:text-academixPurpleDark transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-4 pe-8 font-bold text-gray-900 text-2xl">
          {t("heading", { name: userName })}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-2 w-full">
                <label className="font-medium text-gray-700 text-sm">
                  {t("title")}
                </label>
                <input
                  type="text"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                  placeholder={t("titlePlaceholder")}
                  required
                />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label className="font-medium text-gray-700 text-sm">
                  {t("message")}
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all resize-none"
                  placeholder={t("messagePlaceholder")}
                  rows={5}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 px-4 py-3 border border-red-200 rounded-lg font-medium text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-2 rounded-lg font-semibold text-white text-sm transition-all"
            >
              {isSubmitting ? t("sending") : t("send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
