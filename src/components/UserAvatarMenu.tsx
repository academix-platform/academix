"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type UserAvatarMenuProps = {
  fullName: string;
  role: string;
  initials: string;
  imageUrl?: string;
};

const UserAvatarMenu = ({
  fullName,
  role,
  initials,
  imageUrl,
}: UserAvatarMenuProps) => {
  const t = useTranslations("navbar.userMenu");
  const actionsT = useTranslations("actions");
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirectUrl: "/sign-in" });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="border border-gray-200 rounded-full w-9 h-9 overflow-hidden"
        aria-label={t("open")}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={t("avatarAlt")}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex justify-center items-center bg-academixPurpleLight w-full h-full font-semibold text-academixPurpleDark text-xs">
            {initials}
          </span>
        )}
      </button>

      {isMenuOpen && (
        <div className="end-0 z-50 absolute bg-white shadow-lg mt-2 border border-gray-100 rounded-md w-52 overflow-hidden">
          <div className="px-3 py-2 border-gray-100 border-b">
            <p className="font-medium text-gray-700 text-sm">{fullName}</p>
            <p className="text-gray-500 text-xs">{role || t("noRole")}</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="hover:bg-gray-50 disabled:opacity-70 px-3 py-2 w-full text-red-600 text-sm text-start"
          >
            {isSigningOut ? (
              <span className="flex items-center gap-2">
                <span
                  className="border-2 border-red-300 border-t-red-600 rounded-full w-3.5 h-3.5 animate-spin"
                  aria-hidden="true"
                />
                {actionsT("signingOut")}
              </span>
            ) : (
              actionsT("signOut")
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserAvatarMenu;
