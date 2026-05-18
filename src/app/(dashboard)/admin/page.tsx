import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import UserCard from "@/components/UserCard";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/utils";

const AdminPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const user = await requireAuth();
  const roleTypes: UserRole[] = ["admin", "teacher", "student", "parent"];
  const schoolId = user.schoolId;
  const [currentYear, counts] = await Promise.all([
    getCurrentAcademicYearOrNull(schoolId),
    Promise.all([
      prisma.admin.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
    ]),
  ]);
  const countByRole: Record<UserRole, number> = {
    admin: counts[0],
    teacher: counts[1],
    student: counts[2],
    parent: counts[3],
  };
  const currentYearName = currentYear?.name ?? null;

  return (
    <div className="flex lg:flex-row flex-col gap-4 p-4">
      {/* LEFT */}
      <div className="flex flex-col gap-8 w-full lg:w-2/3">
        {/* USER CARDS */}
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
          {roleTypes.map((type) => (
            <UserCard
              key={type}
              type={type}
              count={countByRole[type]}
              currentYearName={currentYearName}
            />
          ))}
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex lg:flex-row flex-col gap-4">
          {/* ATTENDANCE CHART */}
          <div className="w-full h-[450px]">
            <AttendanceChartContainer />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col justify-between w-full lg:w-1/3">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
