import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import UserCard from "@/components/UserCard";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  School,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { PageSearchParams } from "@/lib/pageParams";

type SchoolDashboardRole = Exclude<UserRole, "superAdmin">;

const AdminPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const user = await requireAuth();
  const locale = await getLocale();
  const adminT = await getTranslations("adminDashboard");

  const roleTypes: SchoolDashboardRole[] = [
    "admin",
    "teacher",
    "student",
    "parent",
  ];
  const schoolId = user.schoolId;

  const [currentYear, counts] = await Promise.all([
    getCurrentAcademicYearOrNull(schoolId),
    Promise.all([
      prisma.admin.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
    ]),
  ]);

  const countByRole: Record<SchoolDashboardRole, number> = {
    admin: counts[0],
    teacher: counts[1],
    student: counts[2],
    parent: counts[3],
  };

  const currentYearName = currentYear?.name ?? null;

  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const quickOperations = [
    {
      label: adminT("markAttendance"),
      href: "/list/attendance",
      icon: <CheckCircle2 className="w-4 h-4 text-brandPurple-600" />,
    },
    {
      label: adminT("manageStudents"),
      href: "/list/students",
      icon: <UserRound className="w-4 h-4 text-sky-600" />,
    },
    {
      label: adminT("manageTeachers"),
      href: "/list/teachers",
      icon: <GraduationCap className="w-4 h-4 text-brandPurple-600" />,
    },
    {
      label: adminT("manageClasses"),
      href: "/list/classes",
      icon: <School className="w-4 h-4 text-emerald-600" />,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 1. DASHBOARD HEADER & CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-outline/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
              {adminT("title")}
            </h1>
            {currentYearName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brandPurple-50 text-brandPurple-700 border border-brandPurple-200/80 shadow-2xs">
                <Sparkles className="w-3 h-3" />
                <span>{currentYearName}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-content-muted flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-content-subtle" />
            <span>{formattedDate}</span>
          </p>
        </div>

        {/* Administrative Quick Operations */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickOperations.map((op) => (
            <Link
              key={op.href}
              href={op.href}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline bg-surface text-content-secondary hover:text-brandPurple-700 hover:border-brandPurple-200 hover:bg-brandPurple-50/40 text-xs font-semibold shadow-2xs transition-all"
            >
              {op.icon}
              <span>{op.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 2. MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / PRIMARY COLUMN (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* OVERVIEW METRICS: 4 BALANCED STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {roleTypes.map((type) => (
              <UserCard
                key={type}
                type={type}
                count={countByRole[type]}
                currentYearName={currentYearName}
              />
            ))}
          </div>

          {/* ANALYTICS SECTION */}
          <div className="w-full">
            <AttendanceChartContainer />
          </div>
        </div>

        {/* RIGHT / SECONDARY COLUMN (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <EventCalendarContainer searchParams={searchParams} />
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
