"use client";

import { publishExamGrades } from "@/lib/actions/examWorkflow.actions";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

type PublishGradesButtonProps = {
  examId: number;
  disabled?: boolean;
  allPublished?: boolean;
  allGraded?: boolean;
  alreadyPublished?: boolean;
};

const PublishGradesButton = ({
  examId,
  disabled,
  allPublished,
  allGraded,
  alreadyPublished,
}: PublishGradesButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [synced, setSynced] = useState(false);
  const published = allPublished ?? alreadyPublished ?? false;
  const hasPublishableGrades = allGraded ?? !disabled;
  const isDisabled = disabled ?? (!hasPublishableGrades || published);

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishExamGrades(examId);

      if (result.success) {
        setSynced(true);
        toast.success(
          published
            ? "Published grades synced to results."
            : "Grades published to students."
        );
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not publish grades.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={isDisabled || isPending || synced}
      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      {synced || published
        ? "Grades Published"
        : "Publish Grades"}
    </button>
  );
};

export default PublishGradesButton;
