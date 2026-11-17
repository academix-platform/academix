import Link from "next/link";
import { getTranslations } from "next-intl/server";
import GradeSchemeEditor, {
  type ComponentOption,
} from "@/components/GradeSchemeEditor";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DEFAULT_GRADE_COMPONENTS,
} from "@/lib/gradeComponents";
import {
  getCurrentAcademicYearOrNull,
  semesterAndAnnualWhere,
} from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

type SchemeScope = {
  teacherId: string;
  teacherName: string;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
};

const scopeToken = (scope: SchemeScope) =>
  JSON.stringify([scope.teacherId, scope.classId, scope.subjectId]);

export default async function GradeComponentsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const { role, userId, schoolId } = await enforceRouteAccess(
    "/list/grade-components",
  );
  if (role !== "admin" && role !== "teacher") return null;

  const t = await getTranslations("gradeComponents");
  const year = await getCurrentAcademicYearOrNull(schoolId);
  if (!year) {
    return (
      <div className="p-6">
        <EmptyState title={t("title")} description={t("selectScope")} />
      </div>
    );
  }
  if (!year.currentSemesterStartDate || !year.currentSemesterEndDate) {
    return (
      <div className="p-6">
        <EmptyState title={t("title")} description={t("configureDates")} />
      </div>
    );
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      schoolId,
      academicYearId: year.id,
      ...semesterAndAnnualWhere(year.currentSemester),
      ...(role === "teacher" ? { teacherId: userId } : {}),
    },
    select: {
      teacherId: true,
      teacher: { select: { name: true } },
      classId: true,
      class: { select: { name: true } },
      subjectId: true,
      subject: { select: { name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  const scopesByToken = new Map<string, SchemeScope>();
  for (const lesson of lessons) {
    const scope = {
      teacherId: lesson.teacherId,
      teacherName: lesson.teacher.name,
      classId: lesson.classId,
      className: lesson.class.name,
      subjectId: lesson.subjectId,
      subjectName: lesson.subject.name,
    };
    scopesByToken.set(scopeToken(scope), scope);
  }
  const scopes = Array.from(scopesByToken.values());

  const resolvedSearchParams = await searchParams;
  const selectedToken = getQueryParam(resolvedSearchParams.scope);
  const selectedScope = scopes.find(
    (scope) => scopeToken(scope) === selectedToken,
  );

  const [catalog, scheme] = await Promise.all([
    prisma.gradeComponent.findMany({
      where: { schoolId },
      select: { id: true, key: true, name: true },
      orderBy: { name: "asc" },
    }),
    selectedScope
      ? prisma.gradeScheme.findUnique({
          where: {
            schoolId_teacherId_classId_subjectId_academicYearId_semester: {
              schoolId,
              teacherId: selectedScope.teacherId,
              classId: selectedScope.classId,
              subjectId: selectedScope.subjectId,
              academicYearId: year.id,
              semester: year.currentSemester,
            },
          },
          include: {
            components: {
              include: { component: { select: { key: true, name: true } } },
              orderBy: { id: "asc" },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const standardOptions: ComponentOption[] = DEFAULT_GRADE_COMPONENTS.map((component) => ({
    key: component.key,
    name: component.name,
    label: t(`defaults.${component.key}`),
  }));
  const customOptions: ComponentOption[] = catalog
    .filter((component) => component.key === null)
    .map((component) => ({
      key: null,
      name: component.name,
      label: component.name,
    }));
  const initialComponents =
    scheme?.components.map((item) => {
      const standard = DEFAULT_GRADE_COMPONENTS.find(
        (component) => component.key === item.component.key,
      );
      return {
        key: standard?.key ?? null,
        name: item.component.name,
        label: standard
          ? t(`defaults.${standard.key}`)
          : item.component.name,
        weight: Number(item.weight),
      };
    }) ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("description")}
          </p>
          <p className="mt-2 text-sm font-medium text-purple-700 dark:text-purple-300">
            {t("activeSemester", {
              semester: t(year.currentSemester as "FIRST" | "SECOND"),
            })}
          </p>
        </div>
        <Link
          href="/list/results"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-700"
        >
          {t("backToResults")}
        </Link>
      </div>

      {scopes.length === 0 ? (
        <EmptyState title={t("title")} description={t("noScopes")} />
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-64 flex-1 flex-col gap-2 text-sm font-medium">
              {t("chooseScope")}
              <select
                name="scope"
                defaultValue={selectedToken ?? ""}
                required
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="" disabled>
                  {t("selectScope")}
                </option>
                {scopes.map((scope) => (
                  <option key={scopeToken(scope)} value={scopeToken(scope)}>
                    {role === "admin" ? `${scope.teacherName} — ` : ""}
                    {scope.className} — {scope.subjectName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {t("loadScheme")}
            </button>
          </form>

          {selectedScope ? (
            <GradeSchemeEditor
              teacherId={selectedScope.teacherId}
              classId={selectedScope.classId}
              subjectId={selectedScope.subjectId}
              availableComponents={[...standardOptions, ...customOptions]}
              initialComponents={initialComponents}
            />
          ) : (
            <EmptyState title={t("title")} description={t("selectScope")} />
          )}
        </>
      )}
    </div>
  );
}
