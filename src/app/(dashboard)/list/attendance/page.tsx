import prisma from "@/lib/prisma";
import { type PageSearchParams } from "@/lib/pageParams";
import { getAttendanceData } from "@/lib/attendance";

import AttendanceClient from "@/components/AttendanceClient";
import AttendanceClassSelect from "@/components/AttendanceClassSelect";
import Pagination from "@/components/Pagination";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAttendanceParams } from "@/lib/attendanceParams";
import { enforceRouteAccess } from "@/lib/enforce-route-access";

const AttendancePage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const user = await enforceRouteAccess("/list/attendance");

  const role = user.role;
  const userId = user.userId;

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

  // =========================
  // CLASSES
  const classes =
    role === "admin"
      ? await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : await prisma.class.findMany({
          where: { supervisorId: userId },
          select: { id: true, name: true },
        });

  // Teacher with no classes
  if (role === "teacher" && classes.length === 0) {
    return (
      <div className="flex-1 bg-white m-4 p-6 rounded-md">
        <h1 className="mb-2 font-semibold text-lg">Attendance</h1>
        <div className="text-gray-500 text-sm">
          You are not assigned to supervise any class yet.
        </div>
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
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">Attendance</h1>

        <form className="flex items-center gap-2">
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

          <button className="bg-gray-100 px-3 py-2 rounded-md text-sm">
            Filter
          </button>
        </form>
      </div>

      {/* ADMIN TABS */}
      {role === "admin" && (
        <div className="flex gap-4 mb-4">
          <a
            href={`/list/attendance?scope=students&classId=${effectiveClassId}`}
            className={`px-3 py-1 rounded ${
              scope === "students" ? "bg-blue-500 text-white" : "bg-gray-100"
            }`}
          >
            Students
          </a>

          <a
            href={`/list/attendance?scope=teachers`}
            className={`px-3 py-1 rounded ${
              scope === "teachers" ? "bg-blue-500 text-white" : "bg-gray-100"
            }`}
          >
            Teachers
          </a>
        </div>
      )}

      {/* CLASS SELECT (ADMIN) */}
      {role === "admin" && scope === "students" && (
        <div className="mb-4">
          <AttendanceClassSelect
            classes={classes}
            value={effectiveClassId}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* TEACHER CLASS TABS */}
      {role === "teacher" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {classes.map((cls) => (
            <a
              key={cls.id}
              href={`/list/attendance?classId=${cls.id}`}
              className={`px-3 py-1 rounded ${
                effectiveClassId === cls.id
                  ? "bg-blue-500 text-white"
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
