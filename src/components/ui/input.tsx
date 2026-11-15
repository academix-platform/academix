"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Search } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

const inputSizeStyles = {
  sm: "h-8 px-2.5 text-xs rounded-md",
  md: "h-10 px-3.5 text-sm rounded-lg",
  lg: "h-12 px-4 text-base rounded-lg",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      error,
      leftIcon,
      rightIcon,
      inputSize = "md",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === "password";
    const resolvedType = isPasswordType
      ? showPassword
        ? "text"
        : "password"
      : type;

    const hasError = Boolean(error);
    const isSearchType = type === "search";

    return (
      <div className="relative w-full flex items-center">
        {/* Left Icon or Search icon */}
        {leftIcon ? (
          <span className="absolute start-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </span>
        ) : isSearchType ? (
          <span className="absolute start-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={hasError ? "true" : undefined}
          className={cn(
            "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
            "border transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
            "disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
            hasError
              ? "border-rose-400 dark:border-rose-600 focus-visible:ring-rose-500/30 focus-visible:border-rose-500"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-purple-600 focus-visible:ring-purple-600/20",
            inputSizeStyles[inputSize],
            (leftIcon || isSearchType) ? "ps-9" : "",
            (rightIcon || isPasswordType) ? "pe-10" : "",
            className
          )}
          {...props}
        />

        {/* Right Icon or Password toggle */}
        {isPasswordType ? (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        ) : rightIcon ? (
          <span className="absolute end-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
