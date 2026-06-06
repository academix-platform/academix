"use client";

import LoginContent from "@/components/LoginContent";
import LoadingIndicator from "@/components/loaders/LoadingIndicator";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <LoginContent />
    </Suspense>
  );
}
