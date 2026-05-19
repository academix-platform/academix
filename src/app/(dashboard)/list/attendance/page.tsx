import prisma from "@/lib/prisma";
import { type PageSearchParams } from "@/lib/pageParams";
import { getAttendanceData } from "@/lib/attendance";

import AttendanceClient from "@/components/AttendanceClient";
import AttendanceClassSelect from "@/components/AttendanceClassSelect";
import Pagination from "@/components/Pagination";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import EmptyState from "@/components/states/EmptyState";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAttendanceParams } from "@/lib/attendanceParams";
import { enforceRouteAccess } from "@/lib/enforce-route-access";

const AttendancePage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/attendance");

  const resolved = await searchParams;

  // PARAMS
  const {
    scope: rawScope,
    classId,
    page: p,
    selectedDate,
    day,
    isToday,
  } = getAttendanceParams(resolved);

  const scope: "students" | "teachers" =
    rawScope === "teachers" ? "teachers" : "students";

  // CLASSES
  const classes =
    role === "admin"
      ? await prisma.class.findMany({
          where: { schoolId: schoolId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : await prisma.class.findMany({
          where: {
            schoolId: schoolId,
            supervisorId: userId,
          },
          select: { id: true, name: true },
        });

  // Teacher with no classes
  if (role === "teacher" && classes.length === 0) {
    return (
      <div className="flex-1 bg-white m-4 p-6 rounded-md">
        <h1 className="mb-2 font-semibold text-lg">Attendance</h1>
        <EmptyState
          title="No classes assigned"
          description="You are not assigned to supervise any class yet."
          className="py-6"
        />
      </div>
    );
  }

  const validClassIds = new Set(classes.map((c) => c.id));

  const effectiveClassId =
    classId && validClassIds.has(classId) ? classId : classes[0]?.id;

  // DATA
  const { data, hasAttendance, noCurrentYear } = await getAttendanceData({
    role,
    userId,
    schoolId: schoolId,
    scope,
    classId: effectiveClassId,
    day,
  });

  if (noCurrentYear) {
    return <NoCurrentAcademicYearMessage />;
  }

  // PAGINATION
  const count = data.length;
  const paginatedData = data.slice((p - 1) * ITEM_PER_PAGE, p * ITEM_PER_PAGE);
  // UI
  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-semibold text-lg">Attendance</h1>

        <form className="hidden sm:flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="p-2 border rounded-md text-sm"
          />

          <input type="hidden" name="scope" value={scope} />
          {effectiveClassId && (
            <input type="hidden" name="classId" value={effectiveClassId} />
          )}

          <button className="bg-academixPurple px-3 py-2 rounded-md text-sm">
            Filter
          </button>
        </form>
      </div>

      <div className="flex flex-wrap justify-between items-center">
        {/* ADMIN TABS */}
        {role === "admin" && (
          <div className="flex gap-2 mb-2">
            <a
              href={`/list/attendance?scope=students&classId=${effectiveClassId}`}
              className={`px-3 py-1 rounded-md ${
                scope === "students"
                  ? "bg-academixPurpleDark text-white"
                  : "bg-gray-100"
              }`}
            >
              Students
            </a>

            <a
              href={`/list/attendance?scope=teachers`}
              className={`px-3 py-1 rounded-md ${
                scope === "teachers"
                  ? "bg-academixPurpleDark text-white"
                  : "bg-gray-100"
              }`}
            >
              Teachers
            </a>
          </div>
        )}

        {/* CLASS SELECT (ADMIN) */}
        {role === "admin" && scope === "students" && (
          <div className="mb-4">
            <span className="mr-2">Class:</span>
            <AttendanceClassSelect
              classes={classes}
              value={effectiveClassId}
              selectedDate={selectedDate}
            />
          </div>
        )}
      </div>

      {/* TEACHER CLASS TABS */}
      {role === "teacher" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {classes.map((cls) => (
            <a
              key={cls.id}
              href={`/list/attendance?classId=${cls.id}`}
              className={`px-3 py-1 rounded ${
                effectiveClassId === cls.id
                  ? "bg-academixPurpleDark text-white"
                  : "bg-gray-100"
              }`}
            >
              {cls.name}
            </a>
          ))}
        </div>
      )}

      {/* TABLE */}
      <AttendanceClient
        data={paginatedData}
        selectedDate={selectedDate}
        isToday={isToday}
        hasAttendance={hasAttendance}
        scope={scope}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendancePage;
