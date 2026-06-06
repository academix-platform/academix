import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import StudentSelector from "@/components/StudentSelector";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const statesT = await getTranslations("states");
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
    return (
      <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
        <EmptyState
          title={statesT("noStudentsLinked")}
          description={statesT("noStudentsLinkedDescription")}
        />
      </div>
    );
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
            <EmptyState
              title={statesT("noClassAssigned")}
              description={statesT("selectedStudentNoClass")}
              className="py-8"
            />
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col justify-between w-full lg:w-1/3">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;
