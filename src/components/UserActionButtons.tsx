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
        className={`p-2 flex items-center justify-center text-academixPurpleDark hover:bg-gray-100 rounded-md transition bg-academixPurple`}
        title="Send message"
      >
        <Mail className="w-4 h-4 text-academixPurpleDark" />
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
