import Announcements from "@/components/Announcements";
import AttendanceChartLoader from "@/components/AttendanceChartLoader";
import CountChartLoader from "@/components/CountChartLoader";
import EventCalendarLoader from "@/components/EventCalendarLoader";
import FinanceChartLoader from "@/components/FinanceChartLoader";
import UserCard from "@/components/UserCard";

const AdminPage = () => {
  return (
    <div className="flex md:flex-row flex-col gap-4 p-4">
      {/* LEFT */}
      <div className="flex flex-col gap-8 w-full lg:w-2/3">
        {/* USER CARDS */}
        <div className="flex flex-wrap justify-between gap-4">
          <UserCard type="student" />
          <UserCard type="teacher" />
          <UserCard type="parent" />
          <UserCard type="staff" />
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex lg:flex-row flex-col gap-4">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChartLoader />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChartLoader />
          </div>
        </div>
        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          <FinanceChartLoader />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-8 w-full lg:w-1/3">
        <EventCalendarLoader />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
