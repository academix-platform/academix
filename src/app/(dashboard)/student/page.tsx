import Announcements from "@/components/Announcements";
import BigCalendarLoader from "@/components/BigCalendarLoader";
import EventCalendarLoader from "@/components/EventCalendarLoader";

const StudentPage = () => {
  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Schedule (4A)</h1>
          <BigCalendarLoader />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendarLoader />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;
