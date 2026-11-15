import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center bg-slate-50/50 dark:bg-slate-900/30 p-8 md:p-12 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl text-center w-full mx-auto",
        className,
      )}
      {...props}
    >
      <div className="flex justify-center items-center bg-purple-50 dark:bg-purple-950/60 shadow-xs mb-4 border border-purple-100 dark:border-purple-900/50 rounded-2xl w-14 h-14 text-purple-600 dark:text-purple-400">
        {icon || <Inbox className="w-7 h-7" />}
      </div>

      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-md text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link href={action.href}>
              <Button variant="primary" size="md">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="md" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
