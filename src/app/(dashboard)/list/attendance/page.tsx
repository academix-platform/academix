import Link from "next/link";
import prisma from "@/lib/prisma";
import { type PageSearchParams, getQueryParam } from "@/lib/pageParams";
import { getAttendanceData, getWeeklyAttendanceData } from "@/lib/attendance";
import AttendanceClient from "@/components/AttendanceClient";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import EmptyState from "@/components/states/EmptyState";
import { getAttendanceParams } from "@/lib/attendanceParams";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getTranslations } from "next-intl/server";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Calendar, History } from "lucide-react";

const isDateWithinRange = (date: string, startDate: string, endDate: string) =>
  date >= startDate && date <= endDate;

const AttendancePage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const attendanceT = await getTranslations("attendance");
  const sidebarT = await getTranslations("sidebar.items");

  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/attendance");
  const currentAcademicYear = await getCurrentAcademicYearOrNull(schoolId);

  if (!currentAcademicYear) {
    return <NoCurrentAcademicYearMessage />;
  }

  const resolved = await searchParams;
  const gradeIdParam = getQueryParam(resolved.gradeId);
  const gradeId = gradeIdParam ? Number.parseInt(gradeIdParam, 10) : undefined;
  const selectedGradeId =
    gradeId && !Number.isNaN(gradeId) && gradeId > 0 ? gradeId : undefined;

  // PARAMS
  const {
    scope: rawScope,
    classId,
    selectedDate,
    day,
    isToday,
    view,
  } = getAttendanceParams(resolved);

  const scope: "students" | "teachers" =
    rawScope === "teachers" ? "teachers" : "students";
  const isSelectedDateInAcademicYear = isDateWithinRange(
    selectedDate,
    currentAcademicYear.startDate,
    currentAcademicYear.endDate,
  );

  // Authorization check for editing historical or current records
  const canEdit =
    (role === "admin" || role === "teacher") && isSelectedDateInAcademicYear;

  // CLASSES
  const classes =
    role === "admin"
      ? await prisma.class.findMany({
          where: {
            schoolId: schoolId,
            ...(scope === "students" && selectedGradeId
              ? { gradeId: selectedGradeId }
              : {}),
          },
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
          orderBy: { name: "asc" },
        })
      : await prisma.class.findMany({
          where: {
            schoolId: schoolId,
            supervisorId: userId,
          },
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
          orderBy: { name: "asc" },
        });

  const grades =
    role === "admin"
      ? await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        })
      : [];

  const breadcrumbs = [
    {
      label: sidebarT("dashboard"),
      href: `/${role}`,
    },
    {
      label: attendanceT("title"),
      isCurrent: true,
    },
  ];

  // Teacher with no assigned classes
  if (role === "teacher" && classes.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 xl:p-8 space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <DataPageHeader
          title={attendanceT("title")}
          description={attendanceT("description")}
        />
        <EmptyState
          title={attendanceT("noClassesAssigned")}
          description={attendanceT("noClassesAssignedDescription")}
          className="py-12"
        />
      </div>
    );
  }

  const validClassIds = new Set(classes.map((c) => c.id));
  const defaultClass =
    classes.find((c) => c._count.students > 0) || classes[0];
  const effectiveClassId =
    classId && validClassIds.has(classId) ? classId : defaultClass?.id;

  // DATA
  const [dailyResult, weeklyResult] = isSelectedDateInAcademicYear
    ? await Promise.all([
        getAttendanceData({
          role,
          userId,
          schoolId: schoolId,
          scope,
          classId: effectiveClassId,
          gradeId: selectedGradeId,
          day,
        }),
        getWeeklyAttendanceData({
          role,
          userId,
          schoolId: schoolId,
          scope,
          classId: effectiveClassId,
          gradeId: selectedGradeId,
          anchorDate: selectedDate,
        }),
      ])
    : [
        { data: [], hasAttendance: false, noCurrentYear: false },
        {
          weekDays: [],
          weekStartDate: "",
          weekEndDate: "",
          data: [],
          hasAttendance: false,
          noCurrentYear: false,
        },
      ];

  const { data, hasAttendance, noCurrentYear } = dailyResult;

  if (noCurrentYear) {
    return <NoCurrentAcademicYearMessage />;
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 xl:p-8 space-y-6">
      {/* 1. Standardized Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* 2. Modern DataPageHeader with localized title, description & contextual badges */}
      <DataPageHeader
        title={attendanceT("title")}
        description={attendanceT("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {scope === "students" && (
              <Link
                href={`/list/attendance/sheet${effectiveClassId ? `?classId=${effectiveClassId}` : ""}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline bg-surface text-xs font-semibold text-brandPurple-700 hover:text-brandPurple-800 hover:bg-brandPurple-50 dark:hover:bg-brandPurple-950/40 transition shadow-2xs"
              >
                <span>{attendanceT("paperSheet")}</span>
              </Link>
            )}

            <Badge variant="outline" className="text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <span>{attendanceT("academicYear", { year: currentAcademicYear.name })}</span>
            </Badge>

            {isSelectedDateInAcademicYear ? (
              hasAttendance ? (
                <Badge variant="success" size="sm" dot>
                  {attendanceT("recorded")}
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>
                  {attendanceT("unrecorded")}
                </Badge>
              )
            ) : (
              <Badge variant="destructive" size="sm">
                {attendanceT("dateOutsideAcademicYear", {
                  start: currentAcademicYear.startDate,
                  end: currentAcademicYear.endDate,
                })}
              </Badge>
            )}

            {!isToday && isSelectedDateInAcademicYear && (
              <Badge
                variant="outline"
                size="sm"
                className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
              >
                <History className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{attendanceT("historicalRecord")}</span>
              </Badge>
            )}
          </div>
        }
      />

      {/* 3. Out-of-academic-year alert if needed */}
      {!isSelectedDateInAcademicYear && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs md:text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>
            {attendanceT("dateOutsideAcademicYear", {
              start: currentAcademicYear.startDate,
              end: currentAcademicYear.endDate,
            })}
          </span>
        </div>
      )}

      {/* 4. Complete Interactive Attendance Client */}
      <AttendanceClient
        data={data}
        weeklyData={weeklyResult}
        initialView={view}
        selectedDate={selectedDate}
        isToday={isToday}
        hasAttendance={hasAttendance}
        scope={scope}
        canEdit={canEdit}
        academicYear={{
          id: currentAcademicYear.id,
          name: currentAcademicYear.name,
          startDate: currentAcademicYear.startDate,
          endDate: currentAcademicYear.endDate,
        }}
        classes={classes}
        effectiveClassId={effectiveClassId}
        grades={grades}
        selectedGradeId={selectedGradeId}
        role={role}
      />
    </div>
  );
};

export default AttendancePage;
