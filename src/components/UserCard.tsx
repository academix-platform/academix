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
    <div className="even:bg-amber-300 even:text-academixInk odd:bg-academixPurpleDark odd:text-white p-4 rounded-2xl shadow-sm transition">
      <div className="flex justify-between items-center">
        {currentYearName && (
          <span className="bg-white px-2 py-1 rounded-full text-[10px] font-semibold text-emerald-800">
            {currentYearName}
          </span>
        )}
        <div>{roleIconMap[type]}</div>
      </div>
      <div className="flex md:flex-col items-center md:items-start gap-4 mt-4">
        <p className="font-semibold text-2xl">{count}</p>
        <p className="font-medium text-sm">{t(type)}</p>
      </div>
    </div>
  );
};

export default UserCard;
