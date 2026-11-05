import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "subtle"
    | "inverted"
    | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
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
  inverted:
    "bg-white hover:bg-purple-50 active:bg-purple-100 text-[#24104F] shadow-md border border-transparent focus-visible:ring-white",
  glass:
    "bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border border-white/20 focus-visible:ring-white/40",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-11 px-6 text-base gap-2.5 rounded-lg",
  icon: "h-9 w-9 p-0 rounded-md justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = "button",
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
        className={cn(
          "inline-flex justify-center items-center font-medium transition-all select-none whitespace-nowrap shrink-0",
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
          leftIcon && <span className="leading-none shrink-0 inline-flex items-center">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="leading-none shrink-0 inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
