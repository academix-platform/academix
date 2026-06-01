"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import type { Exam, Question, Answer } from "@prisma/client";
import {
  getExamPage,
  saveAnswer,
  submitExam,
  recordDisconnection,
} from "@/lib/actions/examWorkflow.actions";
import { debounce } from "@/lib/utils";
import ExamTimer from "./ExamTimer";
import FreezeOverlay from "./FreezeOverlay";
import QuestionRenderer from "./QuestionRenderer";

type DebouncedSaveFn = ((questionId: number, answer: string) => void) & {
  flush: () => void;
};

interface ExamClientProps {
  exam: Exam;
  submission: any;
  initialQuestions: Question[];
  initialAnswers: Answer[];
  initialTimeRemaining: number;
  totalPages: number;
}

export default function ExamClient({
  exam,
  submission,
  initialQuestions,
  initialAnswers,
  initialTimeRemaining,
  totalPages,
}: ExamClientProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<number, string>>(
    initialAnswers.reduce(
      (acc, ans) => ({ ...acc, [ans.questionId]: ans.textAnswer || ans.fileUrl || "" }),
      {},
    ),
  );
  const [answerRecords, setAnswerRecords] = useState<Record<number, Answer>>(
    initialAnswers.reduce(
      (acc, ans) => ({ ...acc, [ans.questionId]: ans }),
      {} as Record<number, Answer>,
    ),
  );

  const [currentPage, setCurrentPage] = useState(submission.currentPage);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [questionSaveStatus, setQuestionSaveStatus] = useState<
    Record<number, "idle" | "saving" | "saved" | "error">
  >({});
  const saveTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  const pendingAnswersRef = useRef<Record<number, string>>({});
  const disconnectedAtRef = useRef<number | null>(null);
  const freezeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSaveRef = useRef<DebouncedSaveFn | null>(null);
  const uploadingQuestionsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const debounced = debounce(async (questionId: number, answer: string) => {
      setQuestionSaveStatus((prev) => ({ ...prev, [questionId]: "saving" }));
      const res = await saveAnswer(
        { success: true, error: false },
        {
          submissionId: submission.id,
          questionId,
          textAnswer: answer,
        },
      );

      if (res.error) {
        setQuestionSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));
        toast.error(res.message || "Failed to save answer.");
      } else {
        setQuestionSaveStatus((prev) => ({ ...prev, [questionId]: "saved" }));
        // Clear from pending once saved successfully
        delete pendingAnswersRef.current[questionId];
        // Auto-hide "saved" after 2 seconds
        if (saveTimersRef.current[questionId]) clearTimeout(saveTimersRef.current[questionId]);
        saveTimersRef.current[questionId] = setTimeout(() => {
          setQuestionSaveStatus((prev) => ({ ...prev, [questionId]: "idle" }));
        }, 2000);
      }
    }, 1000);

    debouncedSaveRef.current = debounced;

    return () => {
      debounced.flush();
      debouncedSaveRef.current = null;
    };
  }, [submission.id]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    pendingAnswersRef.current[questionId] = value;
    debouncedSaveRef.current?.(questionId, value);
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (!exam.enableNavigation && newPage < currentPage) {
      toast.error("Navigation to previous pages is disabled.");
      return;
    }

    // Check for unanswered questions on the current page when moving forward
    if (newPage > currentPage) {
      const unanswered = questions.filter((q) => {
        const ans = pendingAnswersRef.current[q.id] !== undefined
          ? pendingAnswersRef.current[q.id]
          : answers[q.id];

        if (ans === undefined || ans === null) return true;
        const trimmed = ans.trim();
        if (trimmed === "") return true;

        if (q.type === "MCQ" && q.allowMultiple) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.filter(Boolean).length === 0;
            }
          } catch {}
        }
        return false;
      });

      if (unanswered.length > 0) {
        toast.error("Please answer all questions on this page before proceeding.");
        return;
      }
    }

    setIsLoadingPage(true);
    debouncedSaveRef.current?.flush();

    // Flush any pending answers immediately
    for (const [qId, ans] of Object.entries(pendingAnswersRef.current)) {
      await saveAnswer(
        { success: true, error: false },
        {
          submissionId: submission.id,
          questionId: parseInt(qId),
          textAnswer: ans,
        },
      );
    }
    pendingAnswersRef.current = {};

    const res = await getExamPage(submission.id, newPage);
    if ("error" in res && res.error) {
      toast.error(res.error as string);
      setIsLoadingPage(false);
      return;
    }

    if ("questions" in res && res.questions) {
      setQuestions(res.questions as Question[]);
      const savedAnswerList = res.savedAnswers as Answer[];
      setAnswers((prev) => {
        const newAns = { ...prev };
        savedAnswerList.forEach((ans) => {
          newAns[ans.questionId] = ans.textAnswer || ans.fileUrl || "";
        });
        return newAns;
      });
      setAnswerRecords((prev) => {
        const newRecs = { ...prev };
        savedAnswerList.forEach((ans) => {
          newRecs[ans.questionId] = ans;
        });
        return newRecs;
      });
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setIsLoadingPage(false);
  };

  const abortAllUploads = async () => {
    if (uploadingQuestionsRef.current.size > 0) {
      document.querySelectorAll("[data-file-upload-question]").forEach((el) => {
        (el as any).__abortUpload?.();
      });
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Check for unanswered questions on the current page before submit
    const unanswered = questions.filter((q) => {
      if (q.type === "FILE") return false; // FILE questions are optional
      const ans = pendingAnswersRef.current[q.id] !== undefined
        ? pendingAnswersRef.current[q.id]
        : answers[q.id];

      if (ans === undefined || ans === null) return true;
      const trimmed = ans.trim();
      if (trimmed === "") return true;

      if (q.type === "MCQ" && q.allowMultiple) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter(Boolean).length === 0;
          }
        } catch {}
      }
      return false;
    });

    if (unanswered.length > 0) {
      toast.error("Please answer all questions on this page before submitting.");
      return;
    }

    if (
      confirm(
        "Are you sure you want to submit your exam? You cannot change your answers after submitting.",
      )
    ) {
      setIsSubmitting(true);
      await abortAllUploads();
      debouncedSaveRef.current?.flush();

      const res = await submitExam(submission.id);
      if (res.error) {
        toast.error(res.error as string);
        setIsSubmitting(false);
      } else {
        toast.success("Exam submitted successfully!");
        router.push("/list/exams");
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await abortAllUploads();
    debouncedSaveRef.current?.flush();
    await submitExam(submission.id);
    toast.info("Exam time is up! Auto-submitting...");
    router.push("/list/exams");
  };

  useEffect(() => {
    const handleOffline = () => {
      freezeTimerRef.current = setTimeout(() => {
        setIsFrozen(true);
        disconnectedAtRef.current = Date.now();
      }, 3000);
    };

    const handleOnline = async () => {
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);

      if (isFrozen && disconnectedAtRef.current) {
        setIsFrozen(false);
        const offlineSeconds = Math.floor(
          (Date.now() - disconnectedAtRef.current) / 1000,
        );
        await recordDisconnection(
          submission.id,
          offlineSeconds,
          new Date(disconnectedAtRef.current),
        );
        disconnectedAtRef.current = null;
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    };
  }, [isFrozen, submission.id]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      for (const [qId, answer] of Object.entries(pendingAnswersRef.current)) {
        navigator.sendBeacon(
          "/api/save-answer",
          JSON.stringify({
            submissionId: submission.id,
            questionId: parseInt(qId),
            textAnswer: answer,
          }),
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submission.id]);

  return (
    <div className="relative mx-auto px-4 py-8 max-w-4xl">
      <FreezeOverlay isFrozen={isFrozen} />

      <div className="top-4 z-10 sticky bg-white shadow-sm mb-6 p-6 border border-gray-200 rounded-lg">
        <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-bold text-gray-900 text-xl">{exam.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600 text-sm">
              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>

            </div>
          </div>

          <div className="flex items-center gap-4">
            {exam.enableTimer && (
              <ExamTimer
                key={submission.id}
                submissionId={submission.id}
                initialTimeRemaining={initialTimeRemaining}
                onSubmit={handleAutoSubmit}
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingPage}
              className="bg-academixPurpleDark hover:bg-academixPurple disabled:opacity-50 px-6 py-2 rounded-md font-semibold text-white transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q) => {
          const qStatus = questionSaveStatus[q.id] || "idle";
          return (
            <div
              key={q.id}
              className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="font-medium text-gray-900">
                  <span className="mr-2">{q.order}.</span>
                  {q.text}
                </div>
                <div className="flex items-center gap-2">
                  {qStatus === "saving" && (
                    <span className="flex items-center gap-1 text-xs text-blue-500 animate-pulse font-medium">
                      Saving...
                    </span>
                  )}
                  {qStatus === "saved" && (
                    <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                      ✓ Saved
                    </span>
                  )}
                  {qStatus === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      ⚠ Error
                    </span>
                  )}
                  <span className="bg-gray-100 px-2 py-1 rounded font-medium text-gray-500 text-sm">
                    {q.points} {q.points === 1 ? "point" : "points"}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <QuestionRenderer
                  question={q}
                  savedAnswer={answers[q.id] || null}
                  savedAnswerRecord={answerRecords[q.id] || null}
                  submissionId={submission.id}
                  examId={exam.id}
                  onChange={handleAnswerChange}
                  disabled={isSubmitting || isLoadingPage}
                  onUploadStart={() => uploadingQuestionsRef.current.add(q.id)}
                  onUploadEnd={() => uploadingQuestionsRef.current.delete(q.id)}
                />
                {q.type === "FILE" && qStatus !== "idle" && (
                  <span className="ml-2 text-xs text-gray-400">File upload</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-white shadow-sm p-4 border border-gray-200 rounded-lg">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={
            currentPage === 1 ||
            !exam.enableNavigation ||
            isLoadingPage ||
            isSubmitting
          }
          className="hover:bg-gray-50 disabled:opacity-50 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <span className="text-gray-500 text-sm">
          {currentPage} / {totalPages}
        </span>

        {currentPage < totalPages ? (
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isLoadingPage || isSubmitting}
            className="hover:bg-gray-50 disabled:opacity-50 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700"
          >
            Next
          </button>
        ) : (
          <div className="opacity-0 px-4 py-2">Next</div> // Spacer
        )}
      </div>
    </div>
  );
}
