"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ErrorState from "@/components/states/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
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
    <div className="flex flex-1 justify-center items-center bg-white m-4 mt-0 p-4 rounded-md">
      <ErrorState
        title={t("pageErrorTitle")}
        description={t("pageErrorDescription")}
        onRetry={handleRetry}
        retryLabel={isPending ? t("retrying") : t("tryAgain")}
      />
    </div>
  );
}
