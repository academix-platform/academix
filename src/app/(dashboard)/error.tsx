"use client";

import { useEffect } from "react";
import ErrorState from "@/components/states/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 justify-center items-center m-4 mt-0 bg-white p-4 rounded-md">
      <ErrorState
        title="Could not load this page"
        description="Please refresh or try again."
        onRetry={reset}
      />
    </div>
  );
}
