"use client";

import { useAuth } from "@clerk/nextjs";
import { createNotification } from "@/src/lib/actions/notification";

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
  
  // Get current user's ID dynamically from Clerk
  const { userId } = useAuth();

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<number, string>>(
    initialAnswers.reduce(
      (acc, ans) => ({ ...acc, [ans.questionId]: ans.textAnswer || "" }),
      {},
    ),
  );

  const [currentPage, setCurrentPage] = useState(submission.currentPage);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const pendingAnswersRef = useRef<Record<number, string>>({});
  const disconnectedAtRef = useRef<number | null>(null);
  const freezeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSaveRef = useRef<DebouncedSaveFn | null>(null);

  useEffect(() => {
    const debounced = debounce(async (questionId: number, answer: string) => {
      setSaveStatus("saving");
      const res = await saveAnswer(
        { success: true, error: false },
        {
          submissionId: submission.id,
          questionId,
          textAnswer: answer,
        },
      );

      if (res.error) {
        setSaveStatus("error");
        toast.error(res.message || "Failed to save answer.");
      } else {
        setSaveStatus("saved");
        delete pendingAnswersRef.current[questionId];
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

    setIsLoadingPage(true);
    debouncedSaveRef.current?.flush();

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
      setAnswers((prev) => {
        const newAns = { ...prev };
        (res.savedAnswers as Answer[]).forEach((ans) => {
          newAns[ans.questionId] = ans.textAnswer || "";
        });
        return newAns;
      });
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setIsLoadingPage(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (
      confirm(
        "Are you sure you want to submit your exam? You cannot change your answers after submitting.",
      )
    ) {
      setIsSubmitting(true);
      debouncedSaveRef.current?.flush();

      const res = await submitExam(submission.id);
      if (res.error) {
        toast.error(res.error as string);
        setIsSubmitting(false);
      } else {
        toast.success("Exam submitted successfully!");
        
        // Trigger notification after successful manual submission
        if (userId) {
          await createNotification(
            userId,
            "Exam Submitted Successfully",
            `You have successfully completed and submitted the exam: ${exam.title}`
          );
        }

        router.push("/list/exams");
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    debouncedSaveRef.current?.flush();
    await submitExam(submission.id);
    toast.info("Exam time is up! Auto-submitting...");
    
    // Trigger notification after automatic timeout submission
    if (userId) {
      await createNotification(
        userId,
        "Exam Auto-Submitted",
        `Time ran out and your exam was automatically submitted: ${exam.title}`
      );
    }

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
              {exam.enableAutoSave && (
                <span
                  className={`flex items-center gap-1 ${
                    saveStatus === "saving"
                      ? "text-blue-500"
                      : saveStatus === "saved"
                        ? "text-green-500"
                        : saveStatus === "error"
                          ? "text-red-500"
                          : "text-gray-400"
                  }`}
                >
                  {saveStatus === "saving" && "Saving..."}
                  {saveStatus === "saved" && "✓ Saved"}
                  {saveStatus === "error" && "⚠ Save failed"}
                </span>
              )}
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
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="font-medium text-gray-900">
                <span className="mr-2">{q.order}.</span>
                {q.text}
              </div>
              <span className="bg-gray-100 px-2 py-1 rounded font-medium text-gray-500 text-sm">
                {q.points} {q.points === 1 ? "point" : "points"}
              </span>
            </div>

            <div className="mt-4">
              <QuestionRenderer
                question={q}
                savedAnswer={answers[q.id] || null}
                onChange={handleAnswerChange}
                disabled={isSubmitting || isLoadingPage}
              />
            </div>
          </div>
        ))}
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
          <div className="opacity-0 px-4 py-2">Next</div>
        )}
      </div>
    </div>
  );
}
