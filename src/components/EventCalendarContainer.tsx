import EventCalendar from "./EventCalendar";
import EventList from "./EventList";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const widgetsT = await getTranslations("widgets");
  const params = await searchParams;
  const dateParam = getQueryParam(params.date);

  return (
    <div className="bg-white mb-2 px-4 rounded-md h-full">
      <EventCalendar />
      <div className="flex justify-between items-center">
        <h1 className="my-4 font-semibold text-xl">{t("events")}</h1>
        <Link
          href="/list/events"
          className="text-gray-400 text-xs hover:underline transition"
        >
          {widgetsT("viewAll")}
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <EventList dateParam={dateParam} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
