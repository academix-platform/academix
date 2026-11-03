import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  onClose?: () => void;
  icon?: React.ReactNode;
}

const variantStyles = {
  info: "bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800",
  success:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  destructive:
    "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800",
};

const defaultIcons = {
  info: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />,
  success: (
    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
  ),
  warning: (
    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
  ),
  destructive: (
    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
  ),
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "info",
      onClose,
      icon,
      children,
      role = "alert",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          "relative flex items-start gap-3 p-4 border rounded-xl text-sm leading-relaxed transition-all",
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        <div className="pt-0.5">{icon ?? defaultIcons[variant]}</div>
        <div className="flex-1 space-y-1">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert"
            className="hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "font-semibold text-sm leading-snug tracking-tight",
      className,
    )}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("opacity-90 text-xs leading-normal", className)}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = "AlertDescription";
