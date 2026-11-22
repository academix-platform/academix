"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";
import { X } from "lucide-react";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider
      value={{ open: isOpen, onOpenChange: handleOpenChange }}
    >
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("DialogTrigger must be used within Dialog");

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        context.onOpenChange(true);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
DialogTrigger.displayName = "DialogTrigger";

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(({ className, size = "md", children, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("DialogContent must be used within Dialog");
  const mounted = useMounted();

  React.useEffect(() => {
    if (!context.open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        context.onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [context]);

  if (!context.open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="z-[100] fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-xs p-4 animate-in duration-200 fade-in-0"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          context.onOpenChange(false);
        }
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl w-full overflow-hidden animate-in duration-200 zoom-in-95",
          sizeStyles[size],
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          type="button"
          aria-label="Close dialog"
          onClick={() => context.onOpenChange(false)}
          className="top-4 absolute hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition end-4"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "space-y-1.5 p-6 pb-2 border-slate-100 dark:border-slate-800 border-b text-start",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "font-bold text-slate-900 dark:text-slate-100 text-lg md:text-xl tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-slate-500 dark:text-slate-400 text-xs md:text-sm",
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("space-y-4 p-6 max-h-[75vh] overflow-y-auto", className)}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex justify-end items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40 p-4 px-6 border-slate-100 dark:border-slate-800 border-t",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";
