import EventCalendar from "./EventCalendar";
import EventList from "./EventList";
import Link from "next/link";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const params = await searchParams;
  const dateParam = params?.date;

  return (
    <div className="bg-white mb-2 px-4 rounded-md h-full">
      <EventCalendar />
      <div className="flex justify-between items-center">
        <h1 className="my-4 font-semibold text-xl">Events</h1>
        <Link
          href="/list/events"
          className="text-gray-400 text-xs hover:underline transition"
        >
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <EventList dateParam={dateParam} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
