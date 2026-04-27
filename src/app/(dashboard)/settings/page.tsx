import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import { getAuthUser } from "@/lib/auth";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { redirect } from "next/navigation";

const SettingsPage = async () => {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  const settings = await getSchoolScheduleSettings();

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
    </div>
  );
};

export default SettingsPage;
