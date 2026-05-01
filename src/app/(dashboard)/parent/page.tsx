import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import StudentSelector from "@/components/StudentSelector";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const params = await searchParams;
  const user = requireAuth();

  const students = await prisma.student.findMany({
    where: {
      parentId: (await user).userId,
      schoolId: (await user).schoolId,
    },
    select: {
      id: true,
      name: true,
      classId: true,
    },
  });

  if (!students.length) {
    return <div>No students found</div>;
  }

  const selectedStudentId = params?.studentId || students[0].id;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const classId = selectedStudent?.classId;

  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">Schedule</h1>
          {students.length > 1 && <StudentSelector students={students} />}
          {classId ? (
            <BigCalendarContainer type="classId" id={classId} />
          ) : (
            <div>No class found</div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col gap-8 w-full xl:w-1/3">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;
