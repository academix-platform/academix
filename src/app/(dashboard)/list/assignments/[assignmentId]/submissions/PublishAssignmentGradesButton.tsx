"use client";

import { publishAssignmentGrades } from "@/lib/actions/submission.actions";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  assignmentId: number;
  disabled?: boolean;
  allPublished?: boolean;
};

export default function PublishAssignmentGradesButton({
  assignmentId,
  disabled,
  allPublished,
}: Props) {
  const router = useRouter();
  const [synced, setSynced] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishAssignmentGrades(assignmentId);

      if (result.success) {
        setSynced(true);
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={disabled || allPublished || synced || isPending}
      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {allPublished || synced ? "Grades Published" : "Publish Grades"}
    </button>
  );
}
