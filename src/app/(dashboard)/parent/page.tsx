import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const user = await getAuthUser();

  if (!user) return null;

  const classes = await prisma.class.findMany({
    where: {
      students: {
        some: {
          parentId: user.userId,
        },
      },
    },
  });

  const classId = classes[0]?.id;

  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">Schedule</h1>

          {classId ? (
            <BigCalendarContainer type="classId" id={classId} />
          ) : (
            <div>No class found</div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col gap-8 w-full xl:w-1/3">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;
