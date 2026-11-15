import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "bg-slate-200/80 dark:bg-slate-800 rounded-md animate-pulse",
        className,
      )}
      {...props}
    />
  );
};
