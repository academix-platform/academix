import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import PeopleImport from "@/components/peopleImport/PeopleImport";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";

// Reading a 10-page PDF can take most of a minute, and server actions use their page's limit.
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration
export const maxDuration = 60;

const ImportStudentsPage = async () => {
  const { role, schoolId } = await enforceRouteAccess("/list/students/import");
  // The proxy already limits this page to admins; this repeats it on the page.
  if (role !== "admin") redirect("/unauthorized");

  // New students are enrolled in the current year, so importing needs one.
  const year = await getCurrentAcademicYearOrNull(schoolId);
  if (!year) return <NoCurrentAcademicYearMessage role={role} />;

  const t = await getTranslations("peopleImport");

  return (
    <div className="flex flex-col flex-1 gap-4 bg-white m-4 mt-0 p-4 rounded-md">
      <Link
        href="/list/students"
        className="inline-flex items-center gap-1 text-academixPurpleDark text-sm hover:underline self-start"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        {t("back")}
      </Link>
      <h1 className="font-semibold text-lg">{t("studentsTitle")}</h1>
      <PeopleImport kind="students" />
    </div>
  );
};

export default ImportStudentsPage;
