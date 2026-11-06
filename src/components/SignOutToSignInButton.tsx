"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { useTranslations } from "next-intl";

const SignOutToSignInButton = () => {
  const t = useTranslations("auth.signOut");
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setIsSigningOut(true);
        await signOut({ redirectUrl: "/sign-in" }).catch(() => {
          setIsSigningOut(false);
        });
      }}
      disabled={isSigningOut}
      className="inline-flex bg-gradient-to-br from-fuchsia-600 to-violet-600 disabled:opacity-80 shadow-md px-4 py-2 rounded-md text-white text-sm"
    >
      {isSigningOut ? t("signingOut") : t("backToSignIn")}
    </button>
  );
};

export default SignOutToSignInButton;
