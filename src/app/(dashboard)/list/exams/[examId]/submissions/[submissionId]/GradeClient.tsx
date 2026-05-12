"use client";

import { gradeAnswer } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CheckCircle, ExternalLink } from "lucide-react";
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
                  {answer.question.type === "FILE" && answer.fileUrl ? (
                    <a
                      href={answer.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-academixPurpleDark hover:underline"
                    >
                      View uploaded file
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
                      disabled={isAutoGraded || isPending}
                      className={`w-20 p-1.5 rounded-md ring-[1.5px] ring-gray-300 text-sm text-center
                        focus:outline-none focus:ring-academixPurpleDark
                        ${isAutoGraded ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                    />
                    <span className="text-sm text-gray-400">
                      / {answer.question.points}
                    </span>
                  </div>

                  {/* Save button - for TEXT and FILE only */}
                  {!isAutoGraded && (
                    <button
                      onClick={() => handleGrade(answer.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-academixPurpleDark text-white text-xs
                        rounded-md hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {isPending ? "Saving..." : "Save"}
                    </button>
                  )}

                  {/* Graded indicator */}
                  {isGraded && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Back button */}
      <div className="mt-6">
        <button
          onClick={() =>
            router.push(`/list/exams/${examId}/submissions`)
          }
          className="px-4 py-2 border border-gray-200 rounded-md text-sm
            hover:bg-gray-50 transition"
        >
          ← Back to Submissions
        </button>
      </div>
    </div>
  );
};

export default GradeClient;
