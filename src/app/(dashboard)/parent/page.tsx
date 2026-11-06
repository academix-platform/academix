import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import StudentSelector from "@/components/StudentSelector";
import { requireAuth } from "@/lib/auth";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("sidebar.items");
  const th = await getTranslations("tableHeaders");
  const statesT = await getTranslations("states");
  const params = await searchParams;
  const user = await requireAuth();

  const students = await prisma.student.findMany({
    where: {
      parentId: user.userId,
      schoolId: user.schoolId,
    },
    select: {
      id: true,
      name: true,
      classId: true,
      class: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: "asc" },
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

  const classOptions = Array.from(
    new Map(
      students
        .filter((student) => student.classId)
        .map((student) => [
          student.classId,
          {
            id: student.classId!,
            name: student.class?.name ?? String(student.classId),
          },
        ]),
    ).values(),
  );
  const requestedClassId = Number.parseInt(
    getQueryParam(params.classId) ?? "",
    10,
  );
  const selectedClass =
    classOptions.find((classOption) => classOption.id === requestedClassId) ??
    classOptions[0];

  const classId = selectedClass?.id;

  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="bg-white p-4 rounded-md h-full">
          <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 mb-4">
            <h1 className="font-semibold text-xl">{t("schedules")}</h1>
            {classOptions.length > 1 && (
              <StudentSelector
                classes={classOptions}
                selectedClassId={classId}
                label={th("class")}
              />
            )}
          </div>

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
