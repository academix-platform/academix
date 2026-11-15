import EventCalendar from "./EventCalendar";
import EventList from "./EventList";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import { ArrowUpRight } from "lucide-react";

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
    <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs space-y-4">
      <EventCalendar />

      <div className="border-t border-outline/60 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-content-primary">
            {t("events")}
          </h2>
          <Link
            href="/list/events"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brandPurple-700 hover:text-brandPurple-800 hover:underline transition"
          >
            <span>{widgetsT("viewAll")}</span>
            <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
          </Link>
        </div>

        <EventList dateParam={dateParam} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
