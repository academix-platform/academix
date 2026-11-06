"use client";

import { gradeAssignmentSubmission } from "@/lib/actions/submission.actions";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";

type Props = {
  submissionId: number;
  maxScore: number;
  currentScore: number | null;
};

export default function AssignmentSubmissionScoreForm({
  submissionId,
  maxScore,
  currentScore,
}: Props) {
  const router = useRouter();
  const [score, setScore] = useState(currentScore?.toString() ?? "0");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setScore(currentScore?.toString() ?? "0");
  }, [currentScore]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextScore = Number(score);

    startTransition(async () => {
      const result = await gradeAssignmentSubmission(submissionId, nextScore);

      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={maxScore}
        step={0.5}
        value={score}
        onChange={(event) => setScore(event.target.value)}
        placeholder={`0-${maxScore}`}
        className="h-9 w-20 rounded-md border border-gray-200 px-2 text-sm outline-none focus:border-academixPurpleDark focus:bg-academixPurpleLight"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-academixPurpleDark text-white transition hover:brightness-90 disabled:opacity-60"
        title="Save score"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}
