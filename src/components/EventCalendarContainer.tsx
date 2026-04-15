import { MoreHorizontal } from "lucide-react";
import EventCalendar from "./EventCalendar";
import EventList from "./EventList";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const params = await searchParams;
  const dateParam = params?.date;

  return (
    <div className="bg-white p-4 rounded-md">
      <EventCalendar />
      <div className="flex justify-between items-center">
        <h1 className="my-4 font-semibold text-xl">Events</h1>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex flex-col gap-4">
        <EventList dateParam={dateParam} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
