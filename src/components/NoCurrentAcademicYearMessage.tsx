import { getAuthUser } from "@/lib/auth";
import { UserRole } from "@/lib/utils";
import EmptyState from "@/components/states/EmptyState";
import { getTranslations } from "next-intl/server";

type Props = {
  compact?: boolean;
  role?: UserRole | null;
};

const NoCurrentAcademicYearMessage = async ({
  compact = false,
  role,
}: Props) => {
  const t = await getTranslations("states");
  const resolvedRole = role ?? (await getAuthUser())?.role ?? null;
  const isAdmin = resolvedRole === "admin";

  if (compact) {
    if (!isAdmin) {
      return (
        <div className="bg-white p-4 rounded-md text-sm">
          <EmptyState
            title={t("noDataYet")}
            description={t("academicYearNotStarted")}
            className="py-2"
          />
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-md text-sm">
        <EmptyState
          title={t("noCurrentYear")}
          description={t("selectCurrentYear")}
          actionLabel={t("goToSettings")}
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
          title={t("noDataYet")}
          description={t("academicYearNotStarted")}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
      <EmptyState
        title={t("noCurrentYear")}
        description={t("selectCurrentYear")}
        actionLabel={t("goToSettings")}
        actionHref="/settings"
      />
    </div>
  );
};

export default NoCurrentAcademicYearMessage;
