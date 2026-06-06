"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

const ErrorState = ({
  title,
  description,
  onRetry,
  retryLabel,
  className = "",
}: ErrorStateProps) => {
  const t = useTranslations("states");
  const resolvedTitle = title ?? t("errorTitle");
  const resolvedDescription = description ?? t("errorDescription");
  const resolvedRetryLabel = retryLabel ?? t("tryAgain");

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}
    >
      <div className="flex justify-center items-center bg-red-100 rounded-full w-12 h-12">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="font-semibold text-red-700 text-lg">{resolvedTitle}</h2>
      <p className="max-w-md text-gray-500 text-sm">{resolvedDescription}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 mt-2 px-4 py-2 rounded-md text-white text-sm transition"
        >
          {resolvedRetryLabel}
        </button>
      )}
    </div>
  );
};

export default ErrorState;
