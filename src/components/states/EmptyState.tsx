"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";

type EmptyStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

const EmptyState = ({
  title,
  description,
  actionLabel,
  actionHref,
  className = "",
}: EmptyStateProps) => {
  const t = useTranslations("emptyStates");
  const resolvedTitle = title ?? t("defaultTitle");
  const resolvedDescription = description ?? t("defaultDescription");

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}
    >
      <div className="flex justify-center items-center bg-gray-100 rounded-full w-12 h-12">
        <Inbox className="w-6 h-6 text-gray-500" />
      </div>
      <h2 className="font-semibold text-gray-800 text-lg">{resolvedTitle}</h2>
      <p className="max-w-md text-gray-500 text-sm">{resolvedDescription}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="bg-academixPurpleDark hover:opacity-90 mt-2 px-4 py-2 rounded-md text-white text-sm transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
