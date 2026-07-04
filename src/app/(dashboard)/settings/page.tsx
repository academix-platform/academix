import SettingsSectionsPanel from "@/components/SettingsSectionsPanel";
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
  const user = await requireAuth();
  requireRole(user, ["admin"]);
  await enforceAdminSchoolAccess(user);

  const [settings, academicYears, dayExceptions] = await Promise.all([
    getSchoolScheduleSettings(user.schoolId),
    getAcademicYears(user.schoolId),
    getSchoolDayExceptions(user.schoolId),
  ]);

  return (
    <div className="bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="font-semibold text-xl">{t("settings")}</h1>
      <p className="mt-2 text-gray-500 text-sm">
        {settingsT("description")}
      </p>

      <SettingsSectionsPanel
        settings={settings}
        academicYears={academicYears}
        dayExceptions={dayExceptions}
      />
    </div>
  );
};

export default SettingsPage;
