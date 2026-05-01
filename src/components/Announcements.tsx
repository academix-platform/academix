import { getAuthUser, requireAuth } from "@/lib/auth";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";

const Announcements = async () => {
  const user = await requireAuth();
  const { role, userId, schoolId } = user;
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };
  const where: Prisma.AnnouncementWhereInput =
    role !== "admin"
      ? {
          schoolId: schoolId,
          academicYearId,
          classes: {
            some:
              roleConditions[role as keyof typeof roleConditions] || undefined,
          },
        }
      : { schoolId: schoolId, academicYearId };

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where,
  });

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-xl">Announcements</h1>
        <span className="text-gray-400 text-xs">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data[0] && (
          <div className="bg-academixSkyLight p-4 rounded-md">
            <div className="flex justify-between items-center">
              <h2 className="font-medium">{data[0].title}</h2>
              <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
                {new Intl.DateTimeFormat("en-US").format(data[0].date)}
              </span>
            </div>
            <p className="mt-1 text-gray-400 text-sm">{data[0].description}</p>
          </div>
        )}
        {data[1] && (
          <div className="bg-academixPurpleLight p-4 rounded-md">
            <div className="flex justify-between items-center">
              <h2 className="font-medium">{data[1].title}</h2>
              <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
                {new Intl.DateTimeFormat("en-US").format(data[1].date)}
              </span>
            </div>
            <p className="mt-1 text-gray-400 text-sm">{data[1].description}</p>
          </div>
        )}
        {data[2] && (
          <div className="bg-academixYellowLight p-4 rounded-md">
            <div className="flex justify-between items-center">
              <h2 className="font-medium">{data[2].title}</h2>
              <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
                {new Intl.DateTimeFormat("en-US").format(data[2].date)}
              </span>
            </div>
            <p className="mt-1 text-gray-400 text-sm">{data[2].description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
