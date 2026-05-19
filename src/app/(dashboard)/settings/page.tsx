import SettingsSectionsPanel from "@/components/SettingsSectionsPanel";
import { getAcademicYears } from "@/lib/academicYears";
import { requireAuth, requireRole } from "@/lib/auth";
import { getSchoolDayExceptions, getSchoolScheduleSettings } from "@/lib/schoolSettings";

const SettingsPage = async () => {
  const user = await requireAuth();
  requireRole(user, ["admin"]);

  const [settings, academicYears, dayExceptions] = await Promise.all([
    getSchoolScheduleSettings(user.schoolId),
    getAcademicYears(user.schoolId),
    getSchoolDayExceptions(user.schoolId),
  ]);

  return (
    <div className="bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="font-semibold text-xl">School Settings</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Configure weekly schedule defaults used by lessons and calendar
        rendering.
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
