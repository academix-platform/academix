import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { requireAuth } from "@/lib/auth";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

const ParentPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const statesT = await getTranslations("states");
  const schedT = await getTranslations("academicSchedule");
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="bg-surface border border-outline/80 rounded-2xl p-6 shadow-2xs">
          <EmptyState
            title={statesT("noStudentsLinked")}
            description={statesT("noStudentsLinkedDescription")}
          />
        </div>
      </div>
    );
  }

  const requestedClassId = Number.parseInt(
    getQueryParam(params.classId) ?? "",
    10,
  );

  const selectedStudent =
    students.find((s) => s.classId === requestedClassId) ?? students[0];
  const classId = selectedStudent.classId;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* PRIMARY COLUMN: TIMETABLE SCHEDULE (8-9 cols on desktop, full width on tablets/laptops < xl) */}
        <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-6 w-full min-w-0">
          <div className="bg-surface border border-outline/80 rounded-2xl p-3 sm:p-5 shadow-2xs space-y-4">
            {/* Child Switcher Tabs for Parents with multiple children */}
            {students.length > 1 && (
              <div className="flex items-center gap-2.5 flex-wrap pb-3 border-b border-outline/60">
                <span className="text-xs font-bold text-content-secondary shrink-0">
                  {schedT("switchChild")}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {students.map((st) => {
                    const isActive = st.classId === classId;
                    return (
                      <Link
                        key={st.id}
                        href={`?classId=${st.classId}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-brandPurple-600 text-white shadow-xs"
                            : "bg-surface-muted text-content-secondary hover:text-content-primary hover:bg-surface-muted/80 border border-outline/70"
                        }`}
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{st.name}</span>
                        {st.class?.name && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-surface text-content-muted"
                            }`}
                          >
                            {st.class.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {classId ? (
              <BigCalendarContainer
                type="classId"
                id={classId}
                childName={`${selectedStudent.name} (${selectedStudent.class?.name ?? ""})`}
              />
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

export default ParentPage;
