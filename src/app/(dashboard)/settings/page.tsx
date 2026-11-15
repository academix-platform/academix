import SettingsSectionsPanel from "@/components/SettingsSectionsPanel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { getAcademicYears } from "@/lib/academicYears";
import { enforceAdminSchoolAccess, requireAuth, requireRole } from "@/lib/auth";
import {
  getSchoolDayExceptions,
  getSchoolScheduleSettings,
} from "@/lib/schoolSettings";
import { getTranslations } from "next-intl/server";

const SettingsPage = async () => {
  const t = await getTranslations("pages");
  const settingsT = await getTranslations("settings");
  const sidebarT = await getTranslations("sidebar.items");
  const user = await requireAuth();
  requireRole(user, ["admin"]);
  await enforceAdminSchoolAccess(user);

  const [settings, academicYears, dayExceptions] = await Promise.all([
    getSchoolScheduleSettings(user.schoolId),
    getAcademicYears(user.schoolId),
    getSchoolDayExceptions(user.schoolId),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("settings"), isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <DataPageHeader
        title={t("settings")}
        description={settingsT("description")}
      />

      {/* Settings Navigation and Panels */}
      <SettingsSectionsPanel
        settings={settings}
        academicYears={academicYears}
        dayExceptions={dayExceptions}
      />
    </div>
  );
};

export default SettingsPage;
