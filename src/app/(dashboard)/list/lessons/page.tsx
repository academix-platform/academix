import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import ExportButton from "@/components/ExportButton";
import FormContainer from "@/components/FormContainer";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { computeClassSelection } from "@/lib/lessons/classSelection";
import { getAccessibleClasses } from "@/lib/lessons/getClasses";
import { parseLessonParams } from "@/lib/lessons/lessonParams";
import { type PageSearchParams } from "@/lib/pageParams";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const user = await enforceRouteAccess("/list/lessons");
  const t = await getTranslations("lessonsPage");
  const filtersT = await getTranslations("filters");
  const resolvedSearchParams = await searchParams;

  const role = user.role;

  const { classId, grade, teacherId } = parseLessonParams(resolvedSearchParams);

  const classes = await getAccessibleClasses({
    role: user.role,
    userId: user.userId,
    schoolId: user.schoolId,
    teacherIdParam: teacherId,
  });

  const { availableGrades, selectedGrade, filteredClasses, selectedClass } =
    computeClassSelection({
      classes,
      selectedClassId: classId,
      selectedGrade: grade,
    });

  const baseParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key === "classId" || key === "page") continue;

    if (typeof value === "string") {
      baseParams[key] = value;
    } else if (Array.isArray(value) && value[0]) {
      baseParams[key] = value[0];
    }
  }

  const buildGradeHref = (gradeLevel: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("grade", gradeLevel.toString());
    return `/list/lessons?${params.toString()}`;
  };

  const buildTabHref = (classId: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("grade", selectedGrade.toString());
    params.set("classId", classId.toString());
    return `/list/lessons?${params.toString()}`;
  };

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex justify-between md:items-center gap-4">
        <h1 className="font-semibold text-xl">{t("title")}</h1>

        <div className="flex items-center gap-2">
          {role === "admin" && selectedClass && (
            <ExportButton
              href={`/api/admin/lessons/export?classId=${selectedClass.id}`}
            />
          )}

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
      </div>

      {classes.length === 0 ? (
        <EmptyState
          title={t("empty.noClassesTitle")}
          description={t("empty.noClassesDescription")}
          className="mt-6"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <span className="me-1 font-medium text-gray-600 text-xs">
              {t("grade")}
            </span>

            {availableGrades.map((gradeLevel) => (
              <Link
                key={gradeLevel}
                href={buildGradeHref(gradeLevel)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  selectedGrade === gradeLevel
                    ? "bg-academixPurple text-white border-academixPurple"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {filtersT("gradeLevel", { level: gradeLevel })}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-6">
            <span className="me-1 font-medium text-gray-600 text-xs">
              {t("classes")}
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
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-gray-700 text-sm">
                  {t("scheduleFor", {
                    grade: selectedClass.grade.level,
                    className: selectedClass.name,
                  })}
                </h2>
              </div>

              <BigCalendarContainer type="classId" id={selectedClass.id} />
            </div>
          ) : (
            <EmptyState
              title={t("empty.noClassesTitle")}
              description={t("empty.noClassesForGrade")}
              className="mt-4"
            />
          )}
        </>
      )}
    </div>
  );
};

export default LessonListPage;
