"use client";

import { useEffect } from "react";
import ErrorState from "@/components/states/ErrorState";

export default function GlobalError({
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
    <main className="flex justify-center items-center min-h-screen">
      <ErrorState
        title="Application error"
        description="An unexpected error happened while loading the app."
        onRetry={reset}
      />
    </main>
  );
}
