import { UserRole } from "@/lib/utils";
import { ShieldCheck, GraduationCap, Users, UserRound, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type SchoolDashboardRole = Exclude<UserRole, "superAdmin">;

const roleIconMap: Record<SchoolDashboardRole, React.ReactNode> = {
  admin: <ShieldCheck className="w-5 h-5 text-current" />,
  teacher: <GraduationCap className="w-5 h-5 text-current" />,
  student: <UserRound className="w-5 h-5 text-current" />,
  parent: <Users className="w-5 h-5 text-current" />,
};

const roleCardStyleMap: Record<
  SchoolDashboardRole,
  {
    card: string;
    icon: string;
    arrow: string;
  }
> = {
  admin: {
    card: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/90 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700/60",
    icon: "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs",
    arrow:
      "text-indigo-400 group-hover:text-indigo-600 dark:text-indigo-400 dark:group-hover:text-indigo-300",
  },
  teacher: {
    card: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/90 dark:border-purple-900/40 hover:border-brandPurple-300 dark:hover:border-brandPurple-700/60",
    icon: "bg-white dark:bg-slate-900 text-brandPurple-700 dark:text-brandPurple-300 border border-brandPurple-200/60 dark:border-brandPurple-800/60 shadow-2xs",
    arrow:
      "text-brandPurple-400 group-hover:text-brandPurple-600 dark:text-brandPurple-400 dark:group-hover:text-brandPurple-300",
  },
  student: {
    card: "bg-sky-50/50 dark:bg-sky-950/20 border-sky-100/90 dark:border-sky-900/40 hover:border-sky-300 dark:hover:border-sky-700/60",
    icon: "bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 shadow-2xs",
    arrow:
      "text-sky-400 group-hover:text-sky-600 dark:text-sky-400 dark:group-hover:text-sky-300",
  },
  parent: {
    card: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/90 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60",
    icon: "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs",
    arrow:
      "text-emerald-400 group-hover:text-emerald-600 dark:text-emerald-400 dark:group-hover:text-emerald-300",
  },
};

const roleLinkMap: Record<SchoolDashboardRole, string> = {
  admin: "/settings",
  teacher: "/list/teachers",
  student: "/list/students",
  parent: "/list/parents",
};

type UserCardProps = {
  type: SchoolDashboardRole;
  count: number;
  currentYearName?: string | null;
};

const UserCard = async ({ type, count }: UserCardProps) => {
  const t = await getTranslations("dashboardCards");
  const styles = roleCardStyleMap[type];

  return (
    <Link
      href={roleLinkMap[type]}
      className={`group relative flex flex-col justify-between border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all duration-200 ${styles.card}`}
    >
      {/* Top Row: Role Icon + Hover Action Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-transform duration-200 group-hover:scale-105 shrink-0 ${styles.icon}`}
        >
          {roleIconMap[type]}
        </div>

        <div className={`flex items-center gap-1 transition-colors ${styles.arrow}`}>
          <span className="text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
            {t("viewList")}
          </span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
        </div>
      </div>

      {/* Body: Number, Role Title & Meaningful Subtitle */}
      <div className="mt-4 space-y-0.5">
        <p className="font-extrabold text-2xl sm:text-3xl tabular-nums tracking-tight text-content-primary">
          {count}
        </p>
        <p className="font-bold text-xs sm:text-sm text-content-primary">
          {t(type)}
        </p>
        <p className="text-[11px] text-content-muted leading-tight truncate">
          {t(`subtitles.${type}`)}
        </p>
      </div>
    </Link>
  );
};

export default UserCard;
