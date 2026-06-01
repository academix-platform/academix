"use client";

import { gradeAnswer, approveAndFinalizeGrading } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CheckCircle, ExternalLink, Loader2, AlertCircle, Download, FileText } from "lucide-react";
import type { Answer, Question, Submission, Student } from "@prisma/client";
import { parseAnswerList } from "@/lib/examAnswerUtils";

type AnswerWithQuestion = Answer & { question: Question };

type GradeClientProps = {
  submission: Submission & { student: Pick<Student, "name" | "username"> };
  answers: AnswerWithQuestion[];
  examTitle: string;
  examId: number;
};

const QuestionTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    TRUE_FALSE: "bg-purple-100 text-purple-700",
    MCQ: "bg-blue-100 text-blue-700",
    TEXT: "bg-orange-100 text-orange-700",
    FILE: "bg-pink-100 text-pink-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${colors[type] ?? "bg-gray-100"}`}>
      {type.replace("_", " ")}
    </span>
  );
};

const AnswerDisplay = ({
  value,
  multi = false,
}: {
  value: string | string[] | null | undefined;
  multi?: boolean;
}) => {
  if (!multi) {
    if (Array.isArray(value)) {
      const text = value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
        .join(", ");

      return text ? <span>{text}</span> : <span className="text-gray-400 italic">No answer provided</span>;
    }

    if (!value || !value.trim()) {
      return <span className="text-gray-400 italic">No answer provided</span>;
    }

    return <span>{value}</span>;
  }

  const items = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter((item) => item.length > 0)
    : parseAnswerList(value);

  if (items.length === 0) {
    return <span className="text-gray-400 italic">No answer provided</span>;
  }

  if (items.length === 1) {
    return <span>{items[0]}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const GradeClient = ({
  submission,
  answers,
  examTitle,
  examId,
}: GradeClientProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const a of answers) {
      if (a.score !== null && a.score !== undefined) {
        map[a.id] = String(a.score);
      }
    }
    return map;
  });

  const [savingStatus, setSavingStatus] = useState<
    Record<number, "idle" | "saving" | "saved" | "error">
  >({});
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleAutoSave = async (answerId: number, maxPoints: number) => {
    const scoreStr = scores[answerId];
    if (scoreStr === undefined || scoreStr === "") {
      return;
    }

    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0) {
      toast.error("Score must be a positive number.");
      setSavingStatus((prev) => ({ ...prev, [answerId]: "error" }));
      return;
    }

    if (score > maxPoints) {
      toast.error(`Score cannot exceed ${maxPoints} points.`);
      setSavingStatus((prev) => ({ ...prev, [answerId]: "error" }));
      return;
    }

    const originalAnswer = answers.find((a) => a.id === answerId);
    if (originalAnswer && originalAnswer.score === score) {
      return; // No change, skip calling server action
    }

    setSavingStatus((prev) => ({ ...prev, [answerId]: "saving" }));

    try {
      const result = await gradeAnswer(
        { success: false, error: false },
        { answerId, score }
      );
      if (result.success) {
        setSavingStatus((prev) => ({ ...prev, [answerId]: "saved" }));
        router.refresh();
      } else {
        toast.error(result.message ?? "Something went wrong.");
        setSavingStatus((prev) => ({ ...prev, [answerId]: "error" }));
      }
    } catch (err) {
      toast.error("Failed to auto-save score.");
      setSavingStatus((prev) => ({ ...prev, [answerId]: "error" }));
    }
  };

  const handleGrade = (answerId: number) => {
    const scoreStr = scores[answerId];
    if (scoreStr === undefined || scoreStr === "") {
      toast.error("Please enter a score.");
      return;
    }

    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0) {
      toast.error("Score must be a positive number.");
      return;
    }

    const answer = answers.find((a) => a.id === answerId);
    if (answer && score > answer.question.points) {
      toast.error(`Score cannot exceed ${answer.question.points} points.`);
      return;
    }

    startTransition(async () => {
      const result = await gradeAnswer(
        { success: false, error: false },
        { answerId, score }
      );
      if (result.success) {
        toast.success("Score saved!");
        router.refresh();
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      const result = await approveAndFinalizeGrading(submission.id);
      if (result.success) {
        toast.success("Grading approved and finalized successfully!");
        router.push(`/list/exams/${examId}/submissions`);
      } else if ("warning" in result && result.warning) {
        toast.warning(result.warning, { autoClose: 6000 });
      } else {
        toast.error("message" in result ? result.message : "Something went wrong.");
      }
    } catch (err) {
      toast.error("An error occurred while finalizing grading.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const totalMax = answers.reduce((sum, a) => sum + a.question.points, 0);
  const gradedAnswers = answers.filter(
    (a) => a.score !== null && a.score !== undefined
  );
  const currentTotal = gradedAnswers.reduce(
    (sum, a) => sum + (a.score ?? 0),
    0
  );
  const allGraded = gradedAnswers.length === answers.length;

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <span
            className="hover:text-gray-600 cursor-pointer"
            onClick={() => router.push(`/list/exams/${examId}/submissions`)}
          >
            {examTitle}
          </span>
          <span>/</span>
          <span className="text-gray-700">Grade Submission</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-semibold text-lg">{submission.student.name}</h1>
            <p className="text-gray-400 text-sm">{submission.student.username}</p>
          </div>

          {/* Score summary */}
          <div className="flex flex-col items-end gap-1">
            <div className="text-2xl font-bold text-academixPurpleDark">
              {currentTotal} / {totalMax}
            </div>
            <div className="text-xs text-gray-400">
              {gradedAnswers.length} of {answers.length} graded
            </div>
            {allGraded && (
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                All graded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="flex flex-col gap-4">
        {answers
          .sort((a, b) => a.question.order - b.question.order)
          .map((answer) => {
            const isAutoGraded =
              answer.question.type === "TRUE_FALSE" ||
              answer.question.type === "MCQ";
            const usesMultiAnswer =
              answer.question.type === "MCQ" && answer.question.allowMultiple;
            const isGraded =
              answer.score !== null && answer.score !== undefined;

            return (
              <div
                key={answer.id}
                className={`border rounded-md p-5 flex flex-col gap-4
                  ${isGraded ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
              >
                {/* Question */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-academixPurpleDark">
                        Q{answer.question.order}
                      </span>
                      <QuestionTypeBadge type={answer.question.type} />
                      {isAutoGraded && (
                        <span className="text-xs text-gray-400 italic">
                          Auto-graded
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 text-sm">
                      {answer.question.text}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {answer.question.points} pts
                  </span>
                </div>

                {/* Student Answer */}
                <div className="bg-white border border-gray-100 rounded-md p-3">
                  <p className="text-xs text-gray-400 mb-1">Student Answer:</p>

                  {/* FILE */}
                  {answer.question.type === "FILE" ? (
                    answer.fileUrl && (answer as any).filePublicId ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {(answer as any).fileOriginalName ?? "Uploaded file"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(answer as any).fileSizeBytes
                                ? `${((answer as any).fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                                : ""}
                              {(answer as any).fileSizeBytes && (answer as any).fileMimeType ? " · " : ""}
                              {(answer as any).fileMimeType?.split("/")?.[1]?.toUpperCase() ?? "FILE"}
                              {(answer as any).fileSizeBytes || (answer as any).fileMimeType ? " · " : ""}
                              Uploaded {answer.savedAt
                                ? new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(answer.savedAt)
                                : ""}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/api/exam-files/${answer.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-academixPurpleDark hover:underline font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download File
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm">No file submitted.</span>
                    )
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      <AnswerDisplay
                        value={answer.textAnswer}
                        multi={usesMultiAnswer}
                      />
                    </div>
                  )}
                </div>

                {/* Correct Answer - for T/F and MCQ */}
                {isAutoGraded && (
                  <div className="bg-green-50 border border-green-100 rounded-md p-3">
                    <p className="text-xs text-gray-400 mb-1">Correct Answer:</p>
                    <div className="text-sm text-green-700 font-medium">
                      <AnswerDisplay
                        value={answer.question.correctAnswer}
                        multi={usesMultiAnswer}
                      />
                    </div>
                  </div>
                )}

                {/* Correct Answer - for TEXT */}
                {answer.question.type === "TEXT" && answer.question.textAnswer && (
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                    <p className="text-xs text-gray-400 mb-1">Correct Answer:</p>
                    <div className="text-sm text-blue-700 whitespace-pre-wrap">
                      {answer.question.textAnswer}
                    </div>
                  </div>
                )}

                {/* Score Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Score:</label>
                    <input
                      type="number"
                      min={0}
                      max={answer.question.points}
                      step={0.5}
                      value={scores[answer.id] ?? ""}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [answer.id]: e.target.value,
                        }))
                      }
                      onBlur={() => handleAutoSave(answer.id, answer.question.points)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={isPending || savingStatus[answer.id] === "saving"}
                      className="w-20 p-1.5 rounded-md ring-[1.5px] ring-gray-300 text-sm text-center
                        focus:outline-none focus:ring-academixPurpleDark"
                    />
                    <span className="text-sm text-gray-400">
                      / {answer.question.points}
                    </span>
                  </div>

                  {/* Localized Status Indicator */}
                  {savingStatus[answer.id] === "saving" && (
                    <span className="flex items-center gap-1 text-xs text-blue-500 animate-pulse font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {savingStatus[answer.id] === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  )}
                  {savingStatus[answer.id] === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  )}



                  {/* Graded indicator */}
                  {isGraded && !savingStatus[answer.id] && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3 justify-between border-t pt-6">
        <button
          onClick={() =>
            router.push(`/list/exams/${examId}/submissions`)
          }
          className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700
            hover:bg-gray-50 transition font-medium"
        >
          ← Back to Submissions
        </button>

        <button
          onClick={handleFinalize}
          disabled={isFinalizing}
          className={`px-5 py-2 rounded-md text-sm font-semibold transition flex items-center gap-2 text-white
            ${submission.status === "GRADED"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-academixPurpleDark hover:opacity-90"}
            disabled:opacity-50`}
        >
          {isFinalizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finalizing...
            </>
          ) : submission.status === "GRADED" ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Grading Finalized (Re-Approve)
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Approve & Finalize Grading
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GradeClient;
