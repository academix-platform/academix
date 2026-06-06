import { requireAuth, requireRole } from "@/lib/auth";
import SignOutToSignInButton from "@/components/SignOutToSignInButton";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function SchoolAccessPage() {
  const user = await requireAuth();
  const commonT = await getTranslations("common");
  requireRole(user, ["admin", "teacher", "student", "parent"]);

  const isPending = user.schoolStatus === "PENDING";
  const isPaused = user.schoolStatus === "PAUSED";

  return (
    <div className="relative flex justify-center items-center bg-[radial-gradient(circle_at_top,_rgba(207,206,255,0.36),_transparent_46%),linear-gradient(135deg,#24104f,#4c1d95_54%,#7c3aed)] p-4 min-h-screen overflow-hidden">
      <div className="z-10 relative shadow-2xl backdrop-blur-sm p-8 border border-white/60 rounded-2xl w-full max-w-lg text-white">
        <h1 className="flex items-center gap-2 mb-4 font-bold text-xl">
          <Image
            src="/logo-white.png"
            alt="Academix logo"
            className="w-[44px] h-[34px] rotate-[-15deg]"
            width={40}
            height={40}
          />
          {commonT("brand")}
        </h1>

        <h2 className="mb-4 font-semibold text-2xl">School Access Status</h2>
        {isPending && (
          <p className="text-sm leading-6">
            Your school is pending approval. Academix team will review your
            request and activate your account once verification is complete.
          </p>
        )}
        {isPaused && (
          <div className="space-y-2">
            <p className="text-sm leading-6">
              Your school is currently paused.
            </p>
            {user.role === "admin" && (
              <p className="text-sm">
                Reason:{" "}
                <span className="font-medium">
                  {user.schoolPauseReason || "No reason provided."}
                </span>
              </p>
            )}
          </div>
        )}
        {!isPending && !isPaused && (
          <p className="text-sm leading-6">Your school account is active.</p>
        )}

        <div className="mt-6">
          <SignOutToSignInButton />
        </div>
      </div>
    </div>
  );
}
