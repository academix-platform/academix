import AcademicYearForm from "@/components/AcademicYearForm";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import { getAcademicYears } from "@/lib/academicYears";
import { requireAuth, requireRole } from "@/lib/auth";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";

const SettingsPage = async () => {
  const user = await requireAuth();
  requireRole(user, ["admin"]);

  const [settings, academicYears] = await Promise.all([
    getSchoolScheduleSettings(user.schoolId),
    getAcademicYears(user.schoolId),
  ]);

  return (
    <div className="bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="font-semibold text-xl">School Settings</h1>
      <p className="mt-2 text-gray-500 text-sm">
        Configure weekly schedule defaults used by lessons and calendar
        rendering.
      </p>

      <div className="mt-6 max-w-3xl">
        <SchoolSettingsForm initialSettings={settings} />
      </div>

      <div className="mt-10 max-w-4xl">
        <h2 className="font-semibold text-lg">Academic Years</h2>
        <p className="mt-2 text-gray-500 text-sm">
          Create and maintain academic year ranges.
        </p>

        <div className="mt-4">
          <AcademicYearForm academicYears={academicYears} />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
