import Link from "next/link";
import { getAuthUser, type UserRole } from "@/lib/auth";

type Props = {
  compact?: boolean;
  role?: UserRole | null;
};

const NoCurrentAcademicYearMessage = async ({
  compact = false,
  role,
}: Props) => {
  const resolvedRole = role ?? (await getAuthUser())?.role ?? null;
  const isAdmin = resolvedRole === "admin";

  if (compact) {
    if (!isAdmin) {
      return (
        <div className="bg-white p-4 rounded-md text-sm">
          <p className="text-gray-600">No data yet.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-md text-sm">
        <p className="text-gray-600">No current year selected.</p>
        <Link href="/settings" className="text-blue-600 hover:underline">
          Go to settings
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
        <h1 className="font-semibold text-lg">No data yet</h1>
        <p className="mt-2 text-gray-500 text-sm">
          Academic year did not begin yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="font-semibold text-lg">No current year selected</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Select a current academic year to view data.
      </p>
      <Link
        href="/settings"
        className="inline-block bg-blue-500 mt-4 px-4 py-2 rounded-md text-white text-sm"
      >
        Go to settings
      </Link>
    </div>
  );
};

export default NoCurrentAcademicYearMessage;
