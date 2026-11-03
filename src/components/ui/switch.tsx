"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  name?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id,
      checked,
      defaultChecked = false,
      disabled = false,
      onChange,
      label,
      description,
      className,
      name,
    },
    ref
  ) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);

    const isControlled = checked !== undefined;
    const resolvedChecked = isControlled ? checked : internalChecked;

    const toggle = () => {
      if (disabled) return;
      const next = !resolvedChecked;
      if (!isControlled) {
        setInternalChecked(next);
      }
      onChange?.(next);
    };

    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={resolvedChecked}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
            resolvedChecked
              ? "bg-purple-600"
              : "bg-slate-200 dark:bg-slate-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {name && (
            <input
              type="hidden"
              name={name}
              value={resolvedChecked ? "true" : "false"}
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
              resolvedChecked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
            )}
          />
        </button>

        {(label || description) && (
          <div className="flex flex-col text-sm select-none">
            {label && (
              <label
                htmlFor={switchId}
                onClick={toggle}
                className={cn(
                  "font-medium text-slate-800 dark:text-slate-200 cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = "Switch";
