import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 text-xs md:text-sm select-none",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {required && (
          <span
            className="font-bold text-rose-500 leading-none"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";

export interface HelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const HelperText = React.forwardRef<
  HTMLParagraphElement,
  HelperTextProps
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      className={cn(
        "mt-1 text-slate-500 dark:text-slate-400 text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
});
HelperText.displayName = "HelperText";

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const ErrorMessage = React.forwardRef<
  HTMLParagraphElement,
  ErrorMessageProps
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className={cn(
        "flex items-center gap-1 mt-1 font-medium text-rose-600 dark:text-rose-400 text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
});
ErrorMessage.displayName = "ErrorMessage";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      required,
      htmlFor,
      helperText,
      error,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-1.5 w-full", className)}
        {...props}
      >
        {label && (
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
        )}
        {children}
        {helperText && !error && <HelperText>{helperText}</HelperText>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    );
  },
);
FormField.displayName = "FormField";
