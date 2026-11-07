import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PrintButton from "@/components/entrySheets/PrintButton";
import SheetLayout from "@/components/entrySheets/SheetLayout";
import { enforceAdminSchoolAccess } from "@/lib/auth";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { loadSheetForPrint } from "@/lib/entrySheets/printSheet";
import prisma from "@/lib/prisma";

// This page sits outside the dashboard layout so the menus never print and
// the sheet isn't clipped to one screen. It repeats that layout's checks.
const PrintSheetPage = async ({ params }: { params: Promise<{ sheetId: string }> }) => {
  const user = await enforceRouteAccess("/list/entry-sheets");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/unauthorized");
  await enforceAdminSchoolAccess(user);

  const { sheetId } = await params;
  const sheet = await loadSheetForPrint(
    prisma,
    { userId: user.userId, role: user.role, schoolId: user.schoolId },
    sheetId,
  );
  if (!sheet) notFound();

  const t = await getTranslations("entrySheet");

  return (
    <main className="bg-gray-100 print:bg-white py-6 print:py-0 min-h-screen">
      <div className="flex flex-wrap justify-center items-center gap-3 mb-6 px-4 print:hidden">
        <Link href="/list/results/class-entry" className="text-academixPurpleDark text-sm underline">
          {t("back")}
        </Link>
        <PrintButton label={t("print")} />
        <p className="w-full text-gray-600 text-sm text-center">{t("printHint")}</p>
      </div>
      <SheetLayout
        sheet={sheet}
        labels={{
          className: t("class"),
          outOf: t("outOf", { max: sheet.maxScore }),
          pageOf: (page, total) => t("pageOf", { page, total }),
          student: t("student"),
          box: t("markBox"),
        }}
      />
    </main>
  );
};

export default PrintSheetPage;
