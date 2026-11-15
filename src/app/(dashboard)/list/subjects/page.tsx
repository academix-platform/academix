import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import GradeFilter from "@/components/GradeFilter";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/states/EmptyState";
import { getLocale, getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildSubjectQuery } from "@/lib/query-builders/subject-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { cn, UserRole } from "@/lib/utils";
import { Subject, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSubjectCardTheme } from "@/lib/subjectCardThemes";
import { sanitizeSubjectName } from "@/lib/scheduleUtils";

type SubjectList = Subject & {
  teachers: Teacher[];
  grade: { id: number; level: number } | null;
};

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const emptyT = await getTranslations("emptyStates");
  const subjectT = await getTranslations("subjectDetails");
  const commonT = await getTranslations("common");
  const locale = await getLocale();
  const { role, userId, schoolId } = await enforceRouteAccess("/list/subjects");

  const {
    query,
    orderBy,
    page: p,
  } = await buildSubjectQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const resolvedSearchParams = await searchParams;

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }
      return value ? [[key, value]] : [];
    }),
  );

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        grade: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.subject.count({ where: query }),
  ]);

  const grades =
    role === "admin"
      ? await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        })
      : [];

  const breadcrumbs = [
    {
      label: commonT("dashboard"),
      href: `/${role}`,
    },
    {
      label: t("allSubjects"),
      isCurrent: true,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <DataPageHeader
        title={t("allSubjects")}
        description={subjectT("allSubjectsDesc")}
        count={count}
        actions={
          role === "admin" ? (
            <>
              <ExportButton
                href={`/api/admin/subjects/export?${exportQuery.toString()}`}
              />
              <FormContainer table="subject" type="create" />
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={role === "admin" ? <GradeFilter grades={grades} /> : undefined}
        actions={<FilterSortActions sortKey="sort" />}
      />

      {data.length === 0 ? (
        <EmptyState
          title={emptyT("subjects")}
          description={emptyT("filterDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {data.map((item: SubjectList, index: number) => {
            const theme = getSubjectCardTheme(item.id, index);
            const SubjectIcon = theme.defaultIcon;
            const localizedName = sanitizeSubjectName(item.name, locale);

            return (
              <article
                key={item.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden border",
                  theme.cardBg,
                  theme.cardBorder,
                  theme.hoverBorder,
                )}
              >
                {/* Card click overlay */}
                <Link
                  href={`/list/subjects/${item.id}`}
                  aria-label={item.name}
                  className="absolute inset-0 z-0 rounded-2xl"
                />

                <div className="space-y-4 z-10 relative pointer-events-none">
                  {/* Top Header: Icon, Subject Title & Unified Class Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs border",
                          theme.iconBg,
                        )}
                      >
                        <SubjectIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2
                          dir="auto"
                          title={item.name}
                          className={cn(
                            "font-bold text-base md:text-lg text-content-primary transition-colors truncate",
                            theme.accentText,
                          )}
                        >
                          {item.name}
                        </h2>
                        {localizedName &&
                        localizedName.toLowerCase() !==
                          item.name.toLowerCase() ? (
                          <span className="text-xs text-content-muted font-medium block truncate">
                            {localizedName}
                          </span>
                        ) : (
                          <span className="text-xs text-content-muted font-medium block truncate">
                            {subjectT("teacherCount", {
                              count: item.teachers.length,
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unified Class Badge */}
                    <Badge
                      size="sm"
                      className="font-semibold bg-white dark:bg-slate-900 text-content-primary border border-outline/90 shadow-2xs shrink-0 self-start mt-0.5"
                    >
                      {item.grade
                        ? subjectT("gradeLevel", { level: item.grade.level })
                        : "-"}
                    </Badge>
                  </div>

                  {/* Teachers Meta */}
                  <div className="pt-3 border-t border-outline/60 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-2 text-content-secondary">
                      <span className="text-content-muted font-medium shrink-0">
                        {subjectT("teachers")}:
                      </span>
                      <span className="font-semibold text-end text-content-primary line-clamp-1">
                        {item.teachers.length > 0
                          ? item.teachers
                              .map((teacher) => teacher.name)
                              .join(", ")
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer: View Details + Admin Actions */}
                <div className="mt-4 pt-3 border-t border-outline/60 flex items-center justify-between text-xs font-semibold">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform pointer-events-none",
                      theme.footerText,
                    )}
                  >
                    <span>{subjectT("viewDetails")}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </div>

                  {role === "admin" && (
                    <div className="flex items-center gap-1.5 pointer-events-auto shrink-0 relative z-20">
                      <FormContainer
                        table="subject"
                        type="update"
                        data={item}
                      />
                      <FormContainer
                        table="subject"
                        type="delete"
                        id={item.id}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination page={p} count={count} />
    </div>
  );
};

export default SubjectListPage;
