import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import UserCard from "@/components/UserCard";

const AdminPage = ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  return (
    <div className="flex lg:flex-row flex-col gap-4 p-4">
      {/* LEFT */}
      <div className="flex flex-col gap-8 w-full lg:w-2/3">
        {/* USER CARDS */}
        <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
          <UserCard type="parent" />
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
      <div className="flex flex-col gap-8 w-full lg:w-1/3">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
