"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ErrorState from "@/components/states/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("states");
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
        title={t("applicationErrorTitle")}
        description={t("applicationErrorDescription")}
        onRetry={handleRetry}
        retryLabel={isPending ? t("retrying") : t("tryAgain")}
      />
    </main>
  );
}
