import { requireAuth } from "@/lib/auth";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Megaphone } from "lucide-react";

const Announcements = async () => {
  const t = await getTranslations("pages");
  const widgetsT = await getTranslations("widgets");
  const emptyT = await getTranslations("emptyStates");
  const locale = await getLocale();
  const user = await requireAuth();
  const { role, userId, schoolId } = user;
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };
  const where: Prisma.AnnouncementWhereInput =
    role !== "admin"
      ? {
          schoolId: schoolId,
          academicYearId,
          classes: {
            some:
              roleConditions[role as keyof typeof roleConditions] || undefined,
          },
        }
      : { schoolId: schoolId, academicYearId };

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where,
  });

  return (
    <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base text-content-primary">
          {t("announcements")}
        </h2>
        <Link
          href="/list/announcements"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brandPurple-700 hover:text-brandPurple-800 hover:underline transition"
        >
          <span>{widgetsT("viewAll")}</span>
          <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-outline/80 bg-surface-muted/20">
          <Megaphone className="w-6 h-6 text-content-subtle mb-1.5" />
          <p className="text-xs font-medium text-content-muted">
            {emptyT("announcements")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-outline/70 bg-surface-muted/40 hover:bg-surface-muted/80 hover:border-brandPurple-200/80 transition-all group"
            >
              {/* Structured Vertical Calendar Date Stamp */}
              <div className="flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-surface border border-outline/90 shadow-2xs shrink-0 text-center select-none pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brandPurple-700 dark:text-brandPurple-400">
                  {new Intl.DateTimeFormat(locale, { month: "short" }).format(
                    item.date,
                  )}
                </span>
                <span className="text-base font-extrabold tabular-nums text-content-primary leading-tight">
                  {new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(
                    item.date,
                  )}
                </span>
              </div>

              {/* Announcement Content with Full Bidirectional Isolation */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold text-xs sm:text-sm text-content-primary truncate">
                  <bdi dir="auto">{item.title}</bdi>
                </h3>
                {item.description && (
                  <p className="text-xs text-content-secondary line-clamp-2 leading-relaxed">
                    <bdi dir="auto">{item.description}</bdi>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
