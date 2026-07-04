import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { getAuthUser } from "@/lib/auth";

const TeacherPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const user = await getAuthUser();

  if (!user) return null;

  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">Schedule</h1>
          <BigCalendarContainer type="teacherId" id={user.userId} />
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

export default TeacherPage;
