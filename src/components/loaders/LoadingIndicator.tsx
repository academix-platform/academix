"use client";

import { useTranslations } from "next-intl";

type LoadingIndicatorProps = {
  label?: string;
  className?: string;
};

const LoadingIndicator = ({
  label,
  className = "",
}: LoadingIndicatorProps) => {
  const t = useTranslations("states");
  const resolvedLabel = label ?? t("loading");

  return (
    <div
      className={`flex min-h-[calc(100vh-96px)] items-center justify-center p-6 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="block w-10 h-10 border-4 border-academixPurple/35 border-t-academixPurpleDark rounded-full animate-spin"
          aria-hidden="true"
        />
        <span className="font-medium text-gray-600 text-lg">
          {resolvedLabel}
        </span>
      </div>
    </div>
  );
};

export default LoadingIndicator;
