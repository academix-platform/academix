import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PrintButton from "@/components/entrySheets/PrintButton";
import SheetLayout from "@/components/entrySheets/SheetLayout";
import { enforceAdminSchoolAccess } from "@/lib/auth";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { loadAttendanceSheetForPrint } from "@/lib/entrySheets/attendanceSheet";
import { loadSheetForPrint } from "@/lib/entrySheets/printSheet";
import prisma from "@/lib/prisma";

// This page sits outside the dashboard layout so the menus never print and
// the sheet isn't clipped to one screen. It repeats that layout's checks.
const PrintSheetPage = async ({ params }: { params: Promise<{ sheetId: string }> }) => {
  const user = await enforceRouteAccess("/list/entry-sheets");
  if (user.role !== "admin" && user.role !== "teacher") redirect("/unauthorized");
  await enforceAdminSchoolAccess(user);

  const { sheetId } = await params;
  const access = { userId: user.userId, role: user.role, schoolId: user.schoolId };
  const t = await getTranslations("entrySheet");

  const results = await loadSheetForPrint(prisma, access, sheetId);
  const attendance = results ? null : await loadAttendanceSheetForPrint(prisma, access, sheetId);
  const printed = results
    ? {
        sheet: results,
        detail: `${results.title} — ${t("outOf", { max: results.maxScore })}`,
        fileName: `${results.code} ${results.className} ${results.title}`,
        box: t("markBox"),
        // Back to the same assessment, not the empty picker.
        backHref: `/list/results/class-entry?assessment=${results.assessment.type}:${results.assessment.id}`,
        backLabel: t("back"),
        hint: t("printHint"),
      }
    : attendance
      ? {
          sheet: attendance,
          detail: t("date", { date: attendance.date }),
          fileName: `${attendance.code} ${attendance.className} ${attendance.date}`,
          box: t("absentBox"),
          backHref: `/list/attendance/sheet?classId=${attendance.classId}&date=${attendance.date}`,
          backLabel: t("backToAttendance"),
          hint: t("attendancePrintHint"),
        }
      : null;
  if (!printed) notFound();

  return (
    <main className="bg-gray-100 print:bg-white py-6 print:py-0 min-h-screen">
      <div className="flex flex-wrap justify-center items-center gap-3 mb-6 px-4 print:hidden">
        <Link href={printed.backHref} className="text-academixPurpleDark text-sm underline">
          {printed.backLabel}
        </Link>
        <PrintButton label={t("print")} fileName={printed.fileName} />
        <PrintButton label={t("downloadPdf")} fileName={printed.fileName} kind="pdf" />
        <p className="w-full text-gray-600 text-sm text-center">{printed.hint}</p>
        <p className="w-full text-gray-600 text-sm text-center">{t("pdfHint")}</p>
      </div>
      <SheetLayout
        sheet={printed.sheet}
        labels={{
          className: t("class"),
          detail: printed.detail,
          pageOf: (page, total) => t("pageOf", { page, total }),
          student: t("student"),
          box: printed.box,
        }}
      />
    </main>
  );
};

export default PrintSheetPage;
