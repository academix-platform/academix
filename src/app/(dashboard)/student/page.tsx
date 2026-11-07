import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

const StudentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const user = await requireAuth();
  const statesT = await getTranslations("states");

  const studentClass = await prisma.class.findFirst({
    where: {
      schoolId: user.schoolId,
      students: {
        some: {
          id: user.userId,
        },
      },
    },
    select: { id: true, name: true },
  });

  const classId = studentClass?.id;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* PRIMARY COLUMN: TIMETABLE SCHEDULE (8-9 cols on desktop, full width on tablets/laptops < xl) */}
        <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-6 w-full min-w-0">
          <div className="bg-surface border border-outline/80 rounded-2xl p-3 sm:p-5 shadow-2xs">
            {classId ? (
              <BigCalendarContainer type="classId" id={classId} />
            ) : (
              <EmptyState
                title={statesT("noClassAssigned")}
                description={statesT("selectedStudentNoClass")}
                className="py-12"
              />
            )}
          </div>
        </div>

        {/* SECONDARY COLUMN: CALENDAR & ANNOUNCEMENTS */}
        <div className="xl:col-span-4 2xl:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 w-full">
          <EventCalendarContainer searchParams={searchParams} />
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
