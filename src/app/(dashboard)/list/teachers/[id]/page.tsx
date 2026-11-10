import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import UserActionButtons from "@/components/UserActionButtons";
import AttendanceCard from "@/components/AttendanceCard";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  CalendarCheck2,
  Droplet,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  School,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

const SingleTeacherPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const t = await getTranslations("profilePages");
  const statesT = await getTranslations("states");
  const rolesT = await getTranslations("roles");
  const sidebarT = await getTranslations("sidebar.items");
  const locale = await getLocale();
  const { id } = await params;

  const { role, schoolId } = await enforceRouteAccess(`/list/teachers`);

  const where: Prisma.TeacherWhereInput = {
    id,
    schoolId,
  };

  const teacher = await prisma.teacher.findFirst({
    where,
    include: {
      subjects: true,
      _count: {
        select: {
          subjects: true,
          lessons: true,
          classes: true,
        },
      },
    },
  });

  if (!teacher) {
    return notFound();
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("teachers"), href: "/list/teachers" },
          { label: teacher.name, isCurrent: true },
        ]}
      />

      {/* Main Grid: Left (Profile + Stats + Schedule) & Right (Shortcuts + Announcements) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column (3/4 on xl) */}
        <div className="xl:col-span-3 space-y-6">
          {/* Top Grid: Profile Card (2 cols) + 2x2 Stats (1 col) on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* USER PROFILE CARD */}
            <div className="lg:col-span-2 relative flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-surface border border-outline/80 rounded-2xl p-6 shadow-2xs overflow-hidden bg-gradient-to-br from-brandPurple-50/40 via-surface to-surface dark:from-brandPurple-950/20 dark:via-surface dark:to-surface">
              {/* Edit & Action Buttons */}
              <div className="absolute top-4 end-4 flex items-center gap-2">
                {role === "admin" && (
                  <FormContainer table="teacher" type="update" data={teacher} />
                )}
                <UserActionButtons
                  table="teacher"
                  userId={teacher.id}
                  userName={teacher.name}
                />
              </div>

              {/* Avatar */}
              <div className="relative shrink-0">
                <Image
                  src={teacher.img || "/avatar.png"}
                  alt={teacher.name}
                  width={112}
                  height={112}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-outline/80 shadow-xs"
                />
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between gap-4 min-w-0 w-full text-center sm:text-start">
                <div className="space-y-1.5 pe-16">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="font-bold text-xl sm:text-2xl text-content-primary tracking-tight truncate">
                      {teacher.name}
                    </h1>
                    <Badge variant="primary" size="sm">
                      {rolesT("teacher")}
                    </Badge>
                    {teacher.bloodType && (
                      <Badge variant="secondary" size="sm" className="gap-1 font-semibold">
                        <Droplet className="w-3 h-3 text-rose-500 fill-rose-500/20 shrink-0" />
                        <span>{teacher.bloodType}</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-content-muted">
                    @{teacher.username}
                  </p>
                </div>

                {/* Contact details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-outline/60 text-xs text-content-secondary">
                  {teacher.birthday && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-content-subtle shrink-0" />
                      <span className="truncate">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(teacher.birthday)}
                      </span>
                    </div>
                  )}
                  {teacher.email && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                      <Mail className="w-4 h-4 text-content-subtle shrink-0" />
                      <a
                        href={`mailto:${teacher.email}`}
                        className="truncate hover:text-brandPurple-600 dark:hover:text-brandPurple-400 transition-colors"
                      >
                        {teacher.email}
                      </a>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                      <Phone className="w-4 h-4 text-content-subtle shrink-0" />
                      <a
                        href={`tel:${teacher.phone}`}
                        dir="ltr"
                        className="truncate hover:text-brandPurple-600 dark:hover:text-brandPurple-400 transition-colors"
                      >
                        {teacher.phone}
                      </a>
                    </div>
                  )}
                  {teacher.address && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-content-subtle shrink-0" />
                      <span className="truncate">{teacher.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2x2 STAT CARDS */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* 1. Attendance */}
              <div className="flex flex-col justify-between gap-3 bg-surface border border-outline/80 rounded-2xl p-4 shadow-2xs hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                    {t("cards.attendance")}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                    <CalendarCheck2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-extrabold text-2xl tabular-nums text-content-primary tracking-tight">
                  <Suspense fallback={<span className="text-xs font-normal text-content-muted">{statesT("loading")}</span>}>
                    <AttendanceCard id={id} scope="teacher" />
                  </Suspense>
                </div>
              </div>

              {/* 2. Subjects */}
              <div className="flex flex-col justify-between gap-3 bg-surface border border-outline/80 rounded-2xl p-4 shadow-2xs hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                    {t("cards.subjects")}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-extrabold text-2xl tabular-nums text-content-primary tracking-tight">
                  {teacher._count.subjects}
                </div>
              </div>

              {/* 3. Lessons */}
              <div className="flex flex-col justify-between gap-3 bg-surface border border-outline/80 rounded-2xl p-4 shadow-2xs hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                    {t("cards.lessons")}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-extrabold text-2xl tabular-nums text-content-primary tracking-tight">
                  {teacher._count.lessons}
                </div>
              </div>

              {/* 4. Classes */}
              <div className="flex flex-col justify-between gap-3 bg-surface border border-outline/80 rounded-2xl p-4 shadow-2xs hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                    {t("cards.classes")}
                  </span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-extrabold text-2xl tabular-nums text-content-primary tracking-tight">
                  {teacher._count.classes}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: SCHEDULE (Untouched content) */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
            <BigCalendarContainer type="teacherId" id={id} />
          </div>
        </div>

        {/* Right Column: Shortcuts + Announcements (1/4 on xl) */}
        <div className="xl:col-span-1 space-y-6">
          {/* SHORTCUTS CARD */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-content-primary">
                {t("shortcuts.title")}
              </h2>
              <Sparkles className="w-4 h-4 text-brandPurple-500" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/list/classes?teacherId=${id}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-outline/70 bg-surface hover:bg-surface-muted hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 group-hover:scale-105 transition-transform shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-content-primary group-hover:text-brandPurple-700 dark:group-hover:text-brandPurple-300 transition-colors truncate">
                    {t("teacher.classes")}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-subtle group-hover:text-brandPurple-600 dark:group-hover:text-brandPurple-400 transition-colors rtl:rotate-[-90deg] shrink-0" />
              </Link>

              <Link
                href={`/list/students?teacherId=${id}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-outline/70 bg-surface hover:bg-surface-muted hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-content-primary group-hover:text-brandPurple-700 dark:group-hover:text-brandPurple-300 transition-colors truncate">
                    {t("teacher.students")}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-subtle group-hover:text-brandPurple-600 dark:group-hover:text-brandPurple-400 transition-colors rtl:rotate-[-90deg] shrink-0" />
              </Link>

              <Link
                href={`/list/exams?teacherId=${id}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-outline/70 bg-surface hover:bg-surface-muted hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 group-hover:scale-105 transition-transform shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-content-primary group-hover:text-brandPurple-700 dark:group-hover:text-brandPurple-300 transition-colors truncate">
                    {t("teacher.exams")}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-subtle group-hover:text-brandPurple-600 dark:group-hover:text-brandPurple-400 transition-colors rtl:rotate-[-90deg] shrink-0" />
              </Link>

              <Link
                href={`/list/assignments?teacherId=${id}`}
                className="group flex items-center justify-between p-3 rounded-xl border border-outline/70 bg-surface hover:bg-surface-muted hover:border-brandPurple-200 dark:hover:border-brandPurple-800 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-content-primary group-hover:text-brandPurple-700 dark:group-hover:text-brandPurple-300 transition-colors truncate">
                    {t("teacher.assignments")}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-subtle group-hover:text-brandPurple-600 dark:group-hover:text-brandPurple-400 transition-colors rtl:rotate-[-90deg] shrink-0" />
              </Link>
            </div>
          </div>

          {/* ANNOUNCEMENTS (Untouched content) */}
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default SingleTeacherPage;
