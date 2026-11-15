"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div
        ref={containerRef}
        className={cn("inline-block relative text-start", className)}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownContext);
  if (!context)
    throw new Error("DropdownMenuTrigger must be inside DropdownMenu");

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={context.isOpen}
      onClick={(e) => {
        context.setIsOpen(!context.isOpen);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }
> = ({ className, align = "start", children, ...props }) => {
  const context = React.useContext(DropdownContext);
  if (!context || !context.isOpen) return null;

  return (
    <div
      role="menu"
      className={cn(
        "z-50 absolute bg-white dark:bg-slate-900 shadow-lg mt-1.5 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl min-w-[180px] text-slate-900 dark:text-slate-100 animate-in fade-in-0 zoom-in-95",
        align === "end" ? "end-0" : "start-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }
>(({ className, destructive, onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownContext);

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      onClick={(e) => {
        onClick?.(e);
        context?.setIsOpen(false);
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg w-full font-medium text-xs md:text-sm text-start transition-colors select-none",
        "focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800",
        destructive
          ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    role="separator"
    className={cn("bg-slate-100 dark:bg-slate-800 my-1 h-px", className)}
  />
);
