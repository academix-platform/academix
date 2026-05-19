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
        className={`p-2 flex items-center justify-center bg-academixPurpleDark hover:scale-[1.05] rounded-md transition text-white`}
        title="Send message"
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
