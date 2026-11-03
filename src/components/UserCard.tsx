import { UserRole } from "@/lib/utils";
import { ShieldCheck, GraduationCap, Users, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

type SchoolDashboardRole = Exclude<UserRole, "superAdmin">;

const roleIconMap: Record<SchoolDashboardRole, React.ReactNode> = {
  admin: <ShieldCheck className="opacity-90 w-6 h-6 text-current" />,
  teacher: <GraduationCap className="opacity-90 w-6 h-6 text-current" />,
  student: <UserRound className="opacity-90 w-6 h-6 text-current" />,
  parent: <Users className="opacity-90 w-6 h-6 text-current" />,
};

type UserCardProps = {
  type: SchoolDashboardRole;
  count: number;
  currentYearName?: string | null;
};

const UserCard = async ({ type, count, currentYearName }: UserCardProps) => {
  const t = await getTranslations("dashboardCards");

  return (
    <div className="even:bg-purple-50 dark:even:bg-purple-950/40 even:text-slate-900 dark:even:text-slate-100 even:border-purple-200 dark:even:border-purple-800 odd:bg-gradient-to-br odd:from-[#24104f] odd:via-purple-900 odd:to-purple-800 odd:text-white odd:border-purple-800 p-5 rounded-2xl border shadow-xs transition-all hover:shadow-md">
      <div className="flex justify-between items-center">
        {currentYearName && (
          <span className="bg-white/90 dark:bg-slate-900/90 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
            {currentYearName}
          </span>
        )}
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10">{roleIconMap[type]}</div>
      </div>
      <div className="flex md:flex-col items-center md:items-start gap-1 mt-4">
        <p className="font-bold text-3xl tabular-nums tracking-tight">{count}</p>
        <p className="font-medium text-xs md:text-sm opacity-90">{t(type)}</p>
      </div>
    </div>
  );
};

export default UserCard;
