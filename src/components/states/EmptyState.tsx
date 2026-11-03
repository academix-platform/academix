"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
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
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30",
        className
      )}
    >
      <div className="flex justify-center items-center bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl w-14 h-14 border border-purple-100 dark:border-purple-900/50 mb-3 shadow-xs">
        <Inbox className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg tracking-tight">
        {resolvedTitle}
      </h3>
      <p className="max-w-md text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 leading-relaxed">
        {resolvedDescription}
      </p>
      {actionLabel && actionHref && (
        <div className="mt-4">
          <Link href={actionHref}>
            <Button variant="primary" size="md">
              {actionLabel}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
