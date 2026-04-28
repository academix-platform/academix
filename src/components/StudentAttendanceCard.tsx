import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import Image from "next/image";

const StudentAttendanceCard = async ({ id }: { id: string }) => {
  const academicYearId = await getCurrentAcademicYearIdOrNull();

  if (!academicYearId) {
    return <h1 className="font-semibold text-xl">-</h1>;
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      studentId: id,
      academicYearId,
    },
  });
  const totalDays = attendance.length;
  const presentDays = attendance.filter((day) => day.present).length;
  const percentage = (presentDays / totalDays) * 100;

  return <h1 className="font-semibold text-xl">{percentage || "-"}%</h1>;
};

export default StudentAttendanceCard;
