import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { getAuthUser, requireAuth } from "@/lib/auth";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const user = requireAuth(await getAuthUser());

  const baseDate = dateParam ? new Date(dateParam) : new Date();

  const academicYearId = await getCurrentAcademicYearIdOrNull(user.schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);

  const data = await prisma.event.findMany({
    take: 3,
    orderBy: { startDate: "desc" },
    where: {
      schoolId: user.schoolId,
      academicYearId,
      startDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return (
    <div>
      {data.map((event) => (
        <div
          className="mb-2 p-5 border-2 border-gray-100 border-t-4 even:border-t-academixPurple odd:border-t-academixSky rounded-md"
          key={event.id}
        >
          <div className="flex justify-between items-center">
            <h1 className="font-semibold text-gray-600">{event.title}</h1>
            <span className="text-gray-300 text-xs">
              {event.startDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
          <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
        </div>
      ))}
    </div>
  );
};
export default EventList;
