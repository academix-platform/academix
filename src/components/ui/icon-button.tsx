import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonProps } from "./button";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonProps["variant"];
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  "aria-label": string;
}

const sizeStyles = {
  sm: "h-7 w-7 rounded-md text-xs",
  md: "h-8 w-8 rounded-md text-sm",
  lg: "h-10 w-10 rounded-lg text-base",
};

const variantStyles: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  primary:
    "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs border border-transparent focus-visible:ring-purple-600",
  secondary:
    "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus-visible:ring-slate-400",
  outline:
    "bg-transparent hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 focus-visible:ring-purple-600",
  ghost:
    "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus-visible:ring-slate-400 border border-transparent",
  destructive:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs border border-transparent focus-visible:ring-rose-600",
  subtle:
    "bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 focus-visible:ring-purple-600",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      loading = false,
      disabled = false,
      children,
      type = "button",
      "aria-label": ariaLabel,
      title,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={cn(
          "inline-flex justify-center items-center transition-all select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
          "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            className="w-4 h-4 animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          children
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
