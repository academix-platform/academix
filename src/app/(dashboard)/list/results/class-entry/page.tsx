import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import AssessmentSelect from "@/components/entrySheets/AssessmentSelect";
import ClassEntryGrid from "@/components/entrySheets/ClassEntryGrid";
import PrintSheetButton from "@/components/entrySheets/PrintSheetButton";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import EmptyState from "@/components/states/EmptyState";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import {
  loadClassEntry,
  loadEntryAssessments,
  parseAssessmentParam,
} from "@/lib/entrySheets/classEntry";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { type PageSearchParams, getQueryParam } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

const ClassEntryPage = async ({ searchParams }: { searchParams: PageSearchParams }) => {
  const user = await enforceRouteAccess("/list/results/class-entry");
  // The proxy also blocks other roles, but the page must not rely on it.
  if (user.role !== "admin" && user.role !== "teacher") redirect("/unauthorized");

  const t = await getTranslations("classEntry");
  const year = await getCurrentAcademicYearOrNull(user.schoolId);
  if (!year) return <NoCurrentAcademicYearMessage />;

  const access = { userId: user.userId, role: user.role, schoolId: user.schoolId };
  const resolved = await searchParams;
  const selectedParam = getQueryParam(resolved.assessment) ?? "";
  const selected = parseAssessmentParam(selectedParam);

  const [assessments, entry] = await Promise.all([
    loadEntryAssessments(prisma, access, year.id),
    selected ? loadClassEntry(prisma, access, selected, year.id) : null,
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="font-semibold text-lg">{t("title")}</h1>
        <Link
          href="/list/results"
          className="flex items-center gap-1 hover:bg-gray-50 px-3 py-2 border rounded-md text-sm"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
          {t("backToResults")}
        </Link>
      </div>

      {assessments.length === 0 ? (
        <EmptyState title={t("noAssessments")} description={t("noAssessmentsDescription")} />
      ) : (
        <div className="mt-4">
          <AssessmentSelect
            value={selectedParam}
            options={assessments.map((assessment) => ({
              value: `${assessment.type}:${assessment.id}`,
              label: `${assessment.title} — ${assessment.className}`,
            }))}
          />
        </div>
      )}

      {assessments.length > 0 && !selected && (
        <EmptyState title={t("pickTitle")} description={t("pickDescription")} />
      )}

      {selected && !entry && (
        <EmptyState title={t("notFound")} description={t("notFoundDescription")} />
      )}

      {entry && (
        <section className="mt-6" aria-labelledby="class-entry-heading">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 id="class-entry-heading" className="font-medium">
              {entry.assessment.title} — {entry.assessment.className}
            </h2>
            {entry.rows.length > 0 && (
              <PrintSheetButton assessment={{ type: entry.assessment.type, id: entry.assessment.id }} />
            )}
          </div>
          <p className="text-gray-600 text-sm">{t("outOf", { max: entry.assessment.maxScore })}</p>
          {entry.onlineCount > 0 && (
            <p className="bg-academixSkyLight mt-3 px-3 py-2 rounded-md text-sm">
              {t("onlineNote", { count: entry.onlineCount })}
            </p>
          )}
          {entry.rows.length === 0 ? (
            <EmptyState title={t("noStudents")} description={t("noStudentsDescription")} />
          ) : (
            <ClassEntryGrid
              // Unsaved marks belong to one assessment.
              key={`${entry.assessment.type}:${entry.assessment.id}`}
              assessment={entry.assessment}
              rows={entry.rows}
            />
          )}
        </section>
      )}
    </div>
  );
};

export default ClassEntryPage;
