import { requireAuth, requireRole } from "@/lib/auth";
import SignOutToSignInButton from "@/components/SignOutToSignInButton";
import Image from "next/image";

export default async function SchoolAccessPage() {
  const user = await requireAuth();
  requireRole(user, ["admin", "teacher", "student", "parent"]);

  const isPending = user.schoolStatus === "PENDING";
  const isPaused = user.schoolStatus === "PAUSED";

  return (
    <div className="relative flex justify-center items-center bg-gradient-to-br from-academixPurpleDark via-violet-600 to-fuchsia-600 p-4 min-h-screen overflow-hidden">
      <div className="-top-24 -left-24 absolute bg-academixPurple/35 blur-3xl rounded-full w-72 h-72" />
      <div className="-right-16 -bottom-20 absolute bg-white/20 blur-3xl rounded-full w-80 h-80" />

      <div className="z-10 relative shadow-2xl backdrop-blur-sm p-8 border border-white/60 rounded-2xl w-full max-w-lg text-white">
        <h1 className="flex items-center gap-2 mb-4 font-bold text-xl">
          <Image
            src="/logo-white.png"
            alt="Academix logo"
            className="w-[44px] h-[34px] rotate-[-15deg]"
            width={40}
            height={40}
          />
          ACADEMIX
        </h1>

        <h2 className="mb-4 font-semibold text-2xl">School Access Status</h2>
        {isPending && (
          <p className="text-sm leading-6">
            Your school is pending approval. A super admin will review your
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
