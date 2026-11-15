"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 me-2",
  right: "left-full top-1/2 -translate-y-1/2 ms-2",
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipId = React.useId();

  return (
    <div
      className="inline-flex relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {React.cloneElement(children, {
        "aria-describedby": isVisible ? tooltipId : undefined,
      })}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "z-50 absolute bg-slate-900 dark:bg-slate-800 shadow-md px-2.5 py-1 rounded-md font-medium text-white text-xs whitespace-nowrap transition-all animate-in duration-150 pointer-events-none fade-in-0 zoom-in-95",
            positionStyles[position],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
