import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/utils";
import { ShieldCheck, GraduationCap, Users, UserRound } from "lucide-react";

const roleIconMap: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="opacity-80 w-6 h-6 text-black" />,
  teacher: <GraduationCap className="opacity-80 w-6 h-6 text-black" />,
  student: <UserRound className="opacity-80 w-6 h-6 text-black" />,
  parent: <Users className="opacity-80 w-6 h-6 text-black" />,
};

const UserCard = async ({ type }: { type: UserRole }) => {
  const user = requireAuth();

  const countByRole: Record<UserRole, () => Promise<number>> = {
    admin: async () =>
      prisma.admin.count({
        where: { schoolId: (await user).schoolId },
      }),
    teacher: async () =>
      prisma.teacher.count({
        where: { schoolId: (await user).schoolId },
      }),
    student: async () =>
      prisma.student.count({
        where: { schoolId: (await user).schoolId },
      }),
    parent: async () =>
      prisma.parent.count({
        where: { schoolId: (await user).schoolId },
      }),
  };

  const data = await countByRole[type]();
  const schoolId = (await user).schoolId;
  const currentYear = await getCurrentAcademicYearOrNull(schoolId as number);

  return (
    <div className="even:bg-academixYellow odd:bg-academixPurple p-4 rounded-2xl">
      <div className="flex justify-between items-center">
        {currentYear && (
          <span className="bg-white px-2 py-1 rounded-full text-[10px] text-green-600">
            {currentYear.name}
          </span>
        )}
        <div className="ml-auto">{roleIconMap[type]}</div>
      </div>
      <div className="flex md:flex-col items-center md:items-start gap-4 mt-4">
        <p className="font-semibold text-2xl">{data}</p>
        <p className="font-medium text-white text-sm capitalize">{type}s</p>
      </div>
    </div>
  );
};

export default UserCard;
