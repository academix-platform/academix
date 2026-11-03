"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import DirectMessageModal from "./DirectMessageModal";

type UserActionButtonsProps = {
  table: "student" | "parent" | "teacher";
  userId: string;
  userName: string;
};

export default function UserActionButtons({
  table,
  userId,
  userName,
}: UserActionButtonsProps) {
  const [messageOpen, setMessageOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMessageOpen(true)}
        className="p-2 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        title="Send message"
        aria-label={`Send message to ${userName}`}
      >
        <Mail className="w-4 h-4" />
      </button>

      {/* Message Modal */}
      <DirectMessageModal
        open={messageOpen}
        setOpen={setMessageOpen}
        userType={table}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
