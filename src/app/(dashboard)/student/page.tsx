import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { getAuthUser, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

const StudentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) => {
  const user = requireAuth();
  const t = await getTranslations("sidebar.items");
  const statesT = await getTranslations("states");

  const studentClass = await prisma.class.findFirst({
    where: {
      schoolId: (await user).schoolId,
      students: {
        some: {
          id: (await user).userId,
        },
      },
    },
    select: { id: true },
  });

  const classId = studentClass?.id;

  return (
    <div className="flex xl:flex-row flex-col gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <h1 className="font-semibold text-xl">{t("schedules")}</h1>

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

export default StudentPage;
