import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface BreadcrumbItemProps {
  href?: string;
  label: React.ReactNode;
  isCurrent?: boolean;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItemProps[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className,
  ...props
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center text-slate-500 dark:text-slate-400 text-xs md:text-sm",
        className,
      )}
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;

          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    isLast
                      ? "font-semibold text-slate-800 dark:text-slate-100"
                      : "font-medium",
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}

              {!isLast && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 rtl:rotate-180 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
