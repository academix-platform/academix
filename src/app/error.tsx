"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ErrorState from "@/components/states/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <main className="flex justify-center items-center min-h-screen">
      <ErrorState
        title="Application error"
        description="An unexpected error happened while loading the app."
        onRetry={handleRetry}
        retryLabel={isPending ? "Retrying..." : "Try again"}
      />
    </main>
  );
}
