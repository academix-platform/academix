"use client";

import { promoteStudentsByPerformance } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

type PromoteStudentsButtonProps = {
  academicYearName: string;
  academicYearEndDate: string;
};

type PromotionOutcome = {
  success: boolean;
  message: string;
  promotedCount?: number;
  graduatedCount?: number;
  repeatedCount?: number;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );

const getTodayIsoDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${day}`;
};

const isAcademicYearFinished = (academicYearEndDate: string) =>
  getTodayIsoDate() > academicYearEndDate;

const PromoteStudentsButton = ({
  academicYearName,
  academicYearEndDate,
}: PromoteStudentsButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [modalView, setModalView] = useState<"info" | "confirm" | "result">(
    "info",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PromotionOutcome | null>(null);

  const openModal = () => {
    setResult(null);
    setIsSubmitting(false);
    setModalView(
      isAcademicYearFinished(academicYearEndDate) ? "confirm" : "info",
    );
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    const shouldRefresh = modalView === "result" && result?.success;
    setIsOpen(false);
    setModalView("info");
    setResult(null);

    if (shouldRefresh) {
      router.refresh();
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await promoteStudentsByPerformance({
        success: false,
        error: false,
      });

      if (response.success) {
        setResult({
          success: true,
          message: response.message ?? "Students promoted successfully.",
          promotedCount: response.promotedCount ?? 0,
          graduatedCount: response.graduatedCount ?? 0,
          repeatedCount: response.repeatedCount ?? 0,
        });
      } else {
        setResult({
          success: false,
          message: response.message ?? "Something went wrong!",
        });
      }

      setModalView("result");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    modalView === "info"
      ? "Academic year is still in progress"
      : modalView === "confirm"
        ? "Confirm student promotion"
        : result?.success
          ? "Promotion completed"
          : "Promotion could not be completed";

  const body =
    modalView === "info" ? (
      <p className="text-gray-600 text-sm leading-6">
        The academic year {academicYearName} ends on {formatDate(academicYearEndDate)}.
        You can update the students once the last day has passed.
      </p>
    ) : modalView === "confirm" ? (
      <p className="text-gray-600 text-sm leading-6">
        The academic year {academicYearName} has finished. Confirm this action to update
        students based on their final performance results.
      </p>
    ) : result?.success ? (
      <div className="flex flex-col gap-4">
        <p className="text-gray-600 text-sm leading-6">{result.message}</p>
        <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <p className="text-emerald-700 text-xs uppercase tracking-wide">
              Promoted
            </p>
            <p className="mt-2 font-semibold text-emerald-900 text-2xl">
              {result.promotedCount ?? 0}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-700 text-xs uppercase tracking-wide">
              Graduated
            </p>
            <p className="mt-2 font-semibold text-blue-900 text-2xl">
              {result.graduatedCount ?? 0}
            </p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-700 text-xs uppercase tracking-wide">
              Repeated
            </p>
            <p className="mt-2 font-semibold text-amber-900 text-2xl">
              {result.repeatedCount ?? 0}
            </p>
          </div>
        </div>
      </div>
    ) : (
      <p className="text-gray-600 text-sm leading-6">
        {result?.message ?? "Something went wrong!"}
      </p>
    );

  return (
    <>
      <button
        type="button"
        className="bg-academixPurpleDark p-3 rounded-md text-white text-sm"
        onClick={openModal}
      >
        Update Students Grades
      </button>

      {isOpen && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 p-4">
          <div className="relative bg-white shadow-lg p-6 rounded-md w-full max-w-lg">
            <button
              type="button"
              className="top-4 right-4 absolute disabled:opacity-50 text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed"
              onClick={closeModal}
              aria-label="Close promotion dialog"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-6">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Academic Year
                </p>
                <h2 className="mt-1 font-semibold text-gray-900 text-xl">
                  {academicYearName}
                </h2>
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Status
                </p>
                <h3 className="mt-1 font-medium text-gray-900 text-lg">
                  {title}
                </h3>
                <div className="mt-3">{body}</div>
              </div>

              {modalView === "confirm" && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="bg-green-600 disabled:opacity-70 px-4 py-2 rounded-md min-w-28 text-white"
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex justify-center items-center gap-2">
                        <span className="border-2 border-white/40 border-t-white rounded-full w-4 h-4 animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              )}

              {modalView !== "confirm" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="bg-gray-800 px-4 py-2 rounded-md text-white"
                    onClick={closeModal}
                  >
                    Ok
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromoteStudentsButton;
