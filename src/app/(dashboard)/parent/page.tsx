import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import BigCalendarLoader from "@/components/BigCalendarLoader";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { getUserId } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const userId = await getUserId();

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { parentId: userId! } },
    },
  });
  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">Schedule (John Doe)</h1>
          <BigCalendarContainer type="classId" id={classItem[0]?.id} />
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
