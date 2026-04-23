import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import { getCurrentRole, getUserId } from "@/lib/auth";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const role = await getCurrentRole();
  const userId = await getUserId();
  const resolvedSearchParams = await searchParams;

  const selectedClassIdParam = getQueryParam(resolvedSearchParams.classId);
  const selectedGradeParam = getQueryParam(resolvedSearchParams.grade);
  const teacherIdParam = getQueryParam(resolvedSearchParams.teacherId);

  const classWhere: Prisma.ClassWhereInput = {};
  const scopedTeacherId = role === "teacher" ? userId : teacherIdParam;

  if (role === "teacher" && !userId) {
    classWhere.id = -1;
  } else if (scopedTeacherId) {
    classWhere.lessons = {
      some: {
        teacherId: scopedTeacherId,
      },
    };
  }

  const classes = await prisma.class.findMany({
    where: classWhere,
    select: {
      id: true,
      name: true,
      grade: { select: { level: true } },
    },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });

  const selectedClassIdFromQuery = selectedClassIdParam
    ? Number.parseInt(selectedClassIdParam, 10)
    : null;

  const selectedGradeFromQuery = selectedGradeParam
    ? Number.parseInt(selectedGradeParam, 10)
    : null;

  const availableGradeLevels = Array.from(
    new Set(classes.map((item) => item.grade.level)),
  ).sort((a, b) => a - b);

  const defaultGradeLevel = availableGradeLevels.includes(1)
    ? 1
    : availableGradeLevels[0];

  const selectedGradeLevel =
    selectedGradeFromQuery &&
    availableGradeLevels.includes(selectedGradeFromQuery)
      ? selectedGradeFromQuery
      : defaultGradeLevel;

  const filteredClasses = classes.filter(
    (item) => item.grade.level === selectedGradeLevel,
  );

  const selectedClass =
    filteredClasses.find((item) => item.id === selectedClassIdFromQuery) ||
    filteredClasses[0];

  const buildTabHref = (classId: number) => {
    const params = new URLSearchParams();

    for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
      if (key === "classId" || key === "page") continue;
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        params.set(key, value);
      }
    }

    params.set("grade", selectedGradeLevel.toString());
    params.set("classId", classId.toString());
    return `/list/lessons?${params.toString()}`;
  };

  const buildGradeHref = (gradeLevel: number) => {
    const params = new URLSearchParams();

    for (const [key, rawValue] of Object.entries(resolvedSearchParams)) {
      if (key === "classId" || key === "page" || key === "grade") continue;
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        params.set(key, value);
      }
    }

    params.set("grade", gradeLevel.toString());

    return `/list/lessons?${params.toString()}`;
  };

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex md:flex-row flex-col justify-between md:items-center gap-4">
        <h1 className="font-semibold text-xl">Lessons Calendar</h1>
        {role === "admin" && selectedClass && (
          <div className="self-end md:self-auto">
            <FormContainer
              table="lesson"
              type="update"
              data={{ classId: selectedClass.id }}
            />
          </div>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="mt-6 text-gray-500 text-sm">
          No classes with lessons are available for this view.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <span className="mr-1 font-medium text-gray-600 text-xs">
              Grade:
            </span>
            {availableGradeLevels.map((gradeLevel) => (
              <Link
                key={gradeLevel}
                href={buildGradeHref(gradeLevel)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  selectedGradeLevel === gradeLevel
                    ? "bg-academixPurple text-white border-academixPurple"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {`Grade ${gradeLevel}`}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-6">
            <span className="mr-1 font-medium text-gray-600 text-xs">
              Classes:
            </span>
            {filteredClasses.map((item) => {
              const isActive = selectedClass?.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={buildTabHref(item.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-academixSky text-white border-academixSky"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {`G${item.grade.level} - ${item.name}`}
                </Link>
              );
            })}
          </div>

          {selectedClass ? (
            <div className="mt-4">
              <h2 className="mb-3 font-medium text-gray-700 text-sm">
                {`Schedule for Grade ${selectedClass.grade.level} - ${selectedClass.name}`}
              </h2>
              <BigCalendarContainer type="classId" id={selectedClass.id} />
            </div>
          ) : (
            <div className="mt-4 text-gray-500 text-sm">
              No classes found for the selected grade.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LessonListPage;
