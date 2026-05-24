import { UserRole } from "@/lib/utils";
import { ShieldCheck, GraduationCap, Users, UserRound } from "lucide-react";

type SchoolDashboardRole = Exclude<UserRole, "superAdmin">;

const roleIconMap: Record<SchoolDashboardRole, React.ReactNode> = {
  admin: <ShieldCheck className="opacity-80 w-6 h-6 text-black" />,
  teacher: <GraduationCap className="opacity-80 w-6 h-6 text-black" />,
  student: <UserRound className="opacity-80 w-6 h-6 text-black" />,
  parent: <Users className="opacity-80 w-6 h-6 text-black" />,
};

type UserCardProps = {
  type: SchoolDashboardRole;
  count: number;
  currentYearName?: string | null;
};

const UserCard = ({ type, count, currentYearName }: UserCardProps) => {
  return (
    <div className="even:bg-academixYellow odd:bg-academixPurple p-4 rounded-2xl">
      <div className="flex justify-between items-center">
        {currentYearName && (
          <span className="bg-white px-2 py-1 rounded-full text-[10px] text-green-600">
            {currentYearName}
          </span>
        )}
        <div className="ml-auto">{roleIconMap[type]}</div>
      </div>
      <div className="flex md:flex-col items-center md:items-start gap-4 mt-4">
        <p className="font-semibold text-2xl">{count}</p>
        <p className="font-medium text-white text-sm capitalize">{type}s</p>
      </div>
    </div>
  );
};

export default UserCard;
