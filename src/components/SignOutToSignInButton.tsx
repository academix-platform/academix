"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

const SignOutToSignInButton = () => {
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
      className="inline-flex bg-academixPurpleDark disabled:opacity-70 px-4 py-2 rounded-md text-white text-sm"
    >
      {isSigningOut ? "Signing out..." : "Back to sign-in"}
    </button>
  );
};

export default SignOutToSignInButton;
