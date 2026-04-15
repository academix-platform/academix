import Announcements from "@/components/Announcements";
import BigCalendarLoader from "@/components/BigCalendarLoader";
import EventCalendarLoader from "@/components/EventCalendarContainer";

const StudentPage = () => {
  return (
    <div className="flex xl:flex-row flex-col gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">Schedule (4A)</h1>
          <BigCalendarLoader />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-8 w-full xl:w-1/3">
        <EventCalendarLoader />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;
