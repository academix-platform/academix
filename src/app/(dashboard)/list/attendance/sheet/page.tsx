import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PrintSheetButton from "@/components/entrySheets/PrintSheetButton";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import EmptyState from "@/components/states/EmptyState";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { isIsoDate, todayInTimeZone } from "@/lib/attendanceRules";
import { loadAttendanceClasses, loadAttendanceStudents } from "@/lib/entrySheets/attendanceSheet";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { type PageSearchParams, getQueryParam } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

const AttendanceSheetPage = async ({ searchParams }: { searchParams: PageSearchParams }) => {
  const user = await enforceRouteAccess("/list/attendance/sheet");
  // The proxy also blocks other roles, but the page must not rely on it.
  if (user.role !== "admin" && user.role !== "teacher") redirect("/unauthorized");

  const t = await getTranslations("attendanceSheet");
  const attendanceT = await getTranslations("attendance");
  const year = await getCurrentAcademicYearOrNull(user.schoolId);
  if (!year) return <NoCurrentAcademicYearMessage />;

  const access = { userId: user.userId, role: user.role, schoolId: user.schoolId };
  const classes = await loadAttendanceClasses(prisma, access);
  if (classes.length === 0) {
    return (
      <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
        <h1 className="font-semibold text-lg">{t("title")}</h1>
        <EmptyState
          title={attendanceT("noClassesAssigned")}
          description={attendanceT("noClassesAssignedDescription")}
        />
      </div>
    );
  }

  const resolved = await searchParams;
  const classParam = getQueryParam(resolved.classId) ?? "";
  const dateParam = getQueryParam(resolved.date);
  const date = isIsoDate(dateParam) ? dateParam : todayInTimeZone();
  const inYear = date >= year.startDate && date <= year.endDate;
  // Only classes the caller may use are offered, so another class id finds nothing.
  const selected = classes.find((option) => String(option.id) === classParam);
  const students = selected ? await loadAttendanceStudents(prisma, user.schoolId, selected.id) : [];

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <h1 className="font-semibold text-lg">{t("title")}</h1>
      <p className="text-gray-600 text-sm">{t("intro")}</p>

      <form className="flex flex-wrap items-end gap-2 mt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">{t("classLabel")}</span>
          <select name="classId" defaultValue={classParam} className="p-2 border rounded-md max-w-full text-sm">
            <option value="">{t("chooseClass")}</option>
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">{t("dateLabel")}</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            min={year.startDate}
            max={year.endDate}
            className="p-2 border rounded-md text-sm"
          />
        </label>
        <button className="bg-academixPurple px-3 py-2 rounded-md text-sm">{t("open")}</button>
      </form>

      {!classParam && <EmptyState title={t("pickTitle")} description={t("pickDescription")} />}

      {classParam && !selected && <EmptyState title={t("notFound")} description={t("notFoundDescription")} />}

      {selected && (
        <section className="mt-6" aria-labelledby="attendance-sheet-heading">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 id="attendance-sheet-heading" className="font-medium">
              {selected.name} — <span dir="ltr">{date}</span>
            </h2>
            {students.length > 0 && inYear && <PrintSheetButton classId={selected.id} date={date} />}
          </div>
          {!inYear && (
            <p className="bg-amber-50 mt-3 px-3 py-2 border border-amber-200 rounded-md text-amber-800 text-sm">
              {attendanceT("dateOutsideAcademicYear", { start: year.startDate, end: year.endDate })}
            </p>
          )}
          {students.length === 0 ? (
            <EmptyState title={t("noStudents")} description={t("noStudentsDescription")} />
          ) : (
            <p className="text-gray-600 text-sm">{t("studentCount", { count: students.length })}</p>
          )}
        </section>
      )}
    </div>
  );
};

export default AttendanceSheetPage;
