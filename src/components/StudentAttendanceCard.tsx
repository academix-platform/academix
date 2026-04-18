import prisma from "@/lib/prisma";
import Image from "next/image";

const StudentAttendanceCard = async ({ id }: { id: string }) => {
  const attendance = await prisma.attendance.findMany({
    where: {
      studentId: id,
      date: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
  });
  const totalDays = attendance.length;
  const presentDays = attendance.filter((day) => day.present).length;
  const percentage = (presentDays / totalDays) * 100;

  return <h1 className="font-semibold text-xl">{percentage || "-"}%</h1>;
};

export default StudentAttendanceCard;
