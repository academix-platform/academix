import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { requireAuth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar as CalendarIcon } from "lucide-react";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const user = await requireAuth();
  const t = await getTranslations("widgets");
  const locale = await getLocale();

  const baseDate = dateParam ? new Date(dateParam) : new Date();

  const academicYearId = await getCurrentAcademicYearIdOrNull(user.schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  const startOfDay = new Date(baseDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setHours(23, 59, 59, 999);

  const data = await prisma.event.findMany({
    take: 3,
    orderBy: { startDate: "asc" },
    where: {
      schoolId: user.schoolId,
      academicYearId,
      startDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-outline/80 bg-surface-muted/20 w-full mx-auto">
        <CalendarIcon className="w-6 h-6 text-content-subtle mb-1.5" />
        <p className="text-xs font-medium text-content-muted">
          {t("noEventsForDay")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((event) => (
        <div
          key={event.id}
          className="p-3.5 rounded-xl border border-outline/70 bg-surface-muted/40 hover:bg-surface-muted/80 transition space-y-1"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-xs sm:text-sm text-content-primary truncate">
              <bdi dir="auto">{event.title}</bdi>
            </h3>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-content-muted bg-surface px-2 py-0.5 rounded-md border border-outline/60">
              {new Intl.DateTimeFormat(locale, {
                hour: "numeric",
                minute: "2-digit",
              }).format(event.startDate)}
            </span>
          </div>
          {event.description && (
            <p className="text-xs text-content-secondary line-clamp-2 leading-relaxed">
              <bdi dir="auto">{event.description}</bdi>
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default EventList;
