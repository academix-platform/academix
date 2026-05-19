import { requireAuth, requireRole } from "@/lib/auth";
import SignOutToSignInButton from "@/components/SignOutToSignInButton";

export default async function SchoolAccessPage() {
  const user = await requireAuth();
  requireRole(user, ["admin", "teacher", "student", "parent"]);

  const isPending = user.schoolStatus === "PENDING";
  const isPaused = user.schoolStatus === "PAUSED";

  return (
    <div className="flex justify-center items-center bg-lamaSkyLight p-4 min-h-screen">
      <div className="bg-white shadow-md p-8 rounded-xl w-full max-w-lg">
        <h1 className="mb-4 font-semibold text-2xl">School Access Status</h1>
        {isPending && (
          <p className="text-gray-700">Your school is pending approval.</p>
        )}
        {isPaused && (
          <div className="space-y-2">
            <p className="text-gray-700">Your school is currently paused.</p>
            {user.role === "admin" && (
              <p className="text-gray-700 text-sm">
                Reason:{" "}
                <span className="font-medium">
                  {user.schoolPauseReason || "No reason provided."}
                </span>
              </p>
            )}
          </div>
        )}
        {!isPending && !isPaused && (
          <p className="text-gray-700">Your school account is active.</p>
        )}

        <div className="mt-6">
          <SignOutToSignInButton />
        </div>
      </div>
    </div>
  );
}
