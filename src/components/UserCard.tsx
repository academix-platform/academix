import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

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

  return (
    <div className="flex-1 even:bg-academixYellow odd:bg-academixPurple p-4 rounded-2xl min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="bg-white px-2 py-1 rounded-full text-[10px] text-green-600">
          2024/25
        </span>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <h1 className="my-4 font-semibold text-2xl">{data}</h1>
      <h2 className="font-medium text-gray-500 text-sm capitalize">{type}s</h2>
    </div>
  );
};

export default UserCard;
