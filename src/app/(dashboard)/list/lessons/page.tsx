import BigCalendarContainer from "@/components/BigCalendarContainer";
import EmptyState from "@/components/states/EmptyState";
import ExportButton from "@/components/ExportButton";
import FormContainer from "@/components/FormContainer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { computeClassSelection } from "@/lib/lessons/classSelection";
import { getAccessibleClasses } from "@/lib/lessons/getClasses";
import { parseLessonParams } from "@/lib/lessons/lessonParams";
import { type PageSearchParams } from "@/lib/pageParams";
import { cn } from "@/lib/utils";
import { Layers, School } from "lucide-react";
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
  const sidebarT = await getTranslations("sidebar.items");
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("schedules"), isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <DataPageHeader
        title={t("title")}
        count={classes.length}
        description={
          selectedClass
            ? t("scheduleFor", {
                grade: selectedClass.grade.level,
                className: selectedClass.name,
              })
            : undefined
        }
        actions={
          role === "admin" && selectedClass ? (
            <div className="flex items-center gap-2">
              <ExportButton
                href={`/api/admin/lessons/export?classId=${selectedClass.id}`}
              />
              <FormContainer
                table="lesson"
                type="update"
                data={{ classId: selectedClass.id }}
              />
            </div>
          ) : undefined
        }
      />

      {classes.length === 0 ? (
        <div className="bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs">
          <EmptyState
            title={t("empty.noClassesTitle")}
            description={t("empty.noClassesDescription")}
          />
        </div>
      ) : (
        <>
          {/* Grade & Class Selection Toolbar */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-5 md:p-6 shadow-2xs space-y-4">
            {/* Grade Selection Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 min-w-[85px] text-content-secondary shrink-0">
                <Layers className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  {t("grade")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {availableGrades.map((gradeLevel) => {
                  const isActive = selectedGrade === gradeLevel;
                  return (
                    <Link
                      key={gradeLevel}
                      href={buildGradeHref(gradeLevel)}
                      className={cn(
                        "inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs",
                        isActive
                          ? "bg-brandPurple-600 text-white shadow-brandPurple-500/20 ring-2 ring-brandPurple-600/30 font-bold"
                          : "bg-surface border border-outline/80 text-content-secondary hover:text-content-primary hover:bg-surface-muted hover:border-outline"
                      )}
                    >
                      {filtersT("gradeLevel", { level: gradeLevel })}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-outline/60" />

            {/* Classes Selection Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 min-w-[85px] text-content-secondary shrink-0">
                <School className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  {t("classes")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filteredClasses.map((item) => {
                  const isActive = selectedClass?.id === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={buildTabHref(item.id)}
                      className={cn(
                        "inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs",
                        isActive
                          ? "bg-brandPurple-600 text-white shadow-brandPurple-500/20 ring-2 ring-brandPurple-600/30 font-bold"
                          : "bg-surface border border-outline/80 text-content-secondary hover:text-content-primary hover:bg-surface-muted hover:border-outline"
                      )}
                    >
                      {`G${item.grade.level} - ${item.name}`}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timetable Section (Calendar untouched) */}
          {selectedClass ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                    {t("scheduleFor", {
                      grade: selectedClass.grade.level,
                      className: selectedClass.name,
                    })}
                  </span>
                  <Badge variant="outline" size="sm" className="font-semibold">
                    {`G${selectedClass.grade.level} - ${selectedClass.name}`}
                  </Badge>
                </div>
              </div>

              <div className="bg-surface border border-outline/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
                <BigCalendarContainer type="classId" id={selectedClass.id} />
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs">
              <EmptyState
                title={t("empty.noClassesTitle")}
                description={t("empty.noClassesForGrade")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LessonListPage;
