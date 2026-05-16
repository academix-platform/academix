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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Title and message are required");
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
          toast.success(`Message sent to ${userName}`);
          setTitle("");
          setDescription("");
          setOpen(false);
          router.refresh();
        } else {
          setError(result.message || "Failed to send message");
          toast.error(result.message || "Failed to send message");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setError(message);
        toast.error(message);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="relative bg-white shadow-xl p-6 rounded-lg w-full max-w-md">
        <button
          onClick={() => setOpen(false)}
          className="top-4 right-4 absolute text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-4 font-semibold text-lg">
          Send Message to {userName}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 font-medium text-gray-600 text-sm">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
              placeholder="Enter message title"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-600 text-sm">
              Message
            </label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm resize-none"
              placeholder="Enter message body"
              rows={4}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 p-2 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-academixPurpleDark disabled:opacity-50 hover:brightness-90 px-4 py-2 rounded-md text-white transition-all"
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
