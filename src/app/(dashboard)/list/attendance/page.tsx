import prisma from "@/lib/prisma";
import { getCurrentRole, getUserId } from "@/lib/auth";
import { type PageSearchParams } from "@/lib/pageParams";
import { getAttendanceData } from "@/lib/attendance";

import AttendanceClient from "@/components/AttendanceClient";
import Pagination from "@/components/Pagination";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAttendanceParams } from "@/lib/attendanceParams";

const AttendancePage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const role = await getCurrentRole();
  const userId = await getUserId();
  const resolved = await searchParams;

  // PARAMS
  const {
    scope,
    classId,
    page: p,
    selectedDate,
    dayStart,
    dayEnd,
    isToday,
  } = getAttendanceParams(resolved);

  // =========================
  // CLASSES
  const classes =
    role === "admin"
      ? await prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : await prisma.class.findMany({
          where: { supervisorId: userId! },
          select: { id: true, name: true },
        });

  // Teacher with no classes
  if (role === "teacher" && classes.length === 0) {
    return (
      <div className="flex-1 bg-white m-4 p-6 rounded-md">
        <h1 className="mb-2 font-semibold text-lg">Attendance</h1>
        <div className="text-gray-500 text-sm">
          You are not assigned to any class yet.
        </div>
      </div>
    );
  }

  const effectiveClassId =
    classId ?? (classes.length > 0 ? classes[0].id : undefined);

  // DATA
  const { data, hasAttendance } = await getAttendanceData({
    role,
    userId,
    scope,
    classId: effectiveClassId,
    dayStart,
    dayEnd,
  });

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
        <form className="flex gap-2 mb-4">
          <input type="hidden" name="scope" value="students" />
          <input type="hidden" name="date" value={selectedDate} />

          <select
            name="classId"
            defaultValue={effectiveClassId}
            className="p-2 border rounded-md text-sm"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <button type="submit" className="hidden" />
        </form>
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
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendancePage;
