import { getAuthUser } from "@/lib/auth";
import { UserRole } from "@/lib/utils";
import EmptyState from "@/components/states/EmptyState";

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
          <EmptyState
            title="No data yet"
            description="Academic year did not begin yet."
            className="py-2"
          />
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-md text-sm">
        <EmptyState
          title="No current year selected"
          description="Select a current academic year to view data."
          actionLabel="Go to settings"
          actionHref="/settings"
          className="py-2"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
        <EmptyState
          title="No data yet"
          description="Academic year did not begin yet."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
      <EmptyState
        title="No current year selected"
        description="Select a current academic year to view data."
        actionLabel="Go to settings"
        actionHref="/settings"
      />
    </div>
  );
};

export default NoCurrentAcademicYearMessage;
