"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const SignOutToSignInButton = () => {
  const t = useTranslations("auth.signOut");
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      type="button"
      onClick={async () => {
        setIsSigningOut(true);
        await signOut({ redirectUrl: "/sign-in" }).catch(() => {
          setIsSigningOut(false);
        });
      }}
      disabled={isSigningOut}
      variant="primary"
      size="md"
      className="font-semibold shadow-xs"
    >
      {isSigningOut ? (
        <>
          <span
            className="border-2 border-white/40 border-t-white rounded-full w-4 h-4 animate-spin"
            aria-hidden="true"
          />
          <span>{t("signingOut")}</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4 rtl:rotate-180" />
          <span>{t("backToSignIn")}</span>
        </>
      )}
    </Button>
  );
};

export default SignOutToSignInButton;
