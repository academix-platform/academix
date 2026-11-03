import * as React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
}

const sizeStyles = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
};

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  busy: "bg-rose-500",
  away: "bg-amber-500",
};

const statusSizes = {
  sm: "w-2 h-2 ring-1",
  md: "w-2.5 h-2.5 ring-2",
  lg: "w-3 h-3 ring-2",
  xl: "w-3.5 h-3.5 ring-2",
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User avatar",
  name,
  size = "md",
  status,
  className,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (text?: string): string => {
    if (!text) return "?";
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showImage = src && !imageError;

  return (
    <div
      className={cn(
        "inline-flex relative justify-center items-center rounded-full select-none shrink-0",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 44px, 56px"
          className="rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="flex justify-center items-center bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-full w-full h-full font-bold text-purple-700 dark:text-purple-300">
          {getInitials(name || alt)}
        </span>
      )}

      {status && (
        <span
          className={cn(
            "bottom-0 absolute rounded-full ring-white dark:ring-slate-900 end-0",
            statusColors[status],
            statusSizes[size],
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};
