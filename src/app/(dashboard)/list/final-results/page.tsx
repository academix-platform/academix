import AcademicYearFilter from "@/components/AcademicYearFilter";
import ClassFilter from "@/components/ClassFilter";
import FinalGradeEditButton from "@/components/FinalGradeEditButton";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAcademicYears,
  getCurrentAcademicYearIdOrNull,
} from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import {
  calculateFinalResultSummary,
  type AssessmentScore,
  type FinalResultStatus,
} from "@/lib/finalResults";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";

type FinalResultRow = {
  id: string;
  name: string;
  className: string;
  averageScore: number | null;
  assessmentCount: number;
  status: FinalResultStatus;
  storedAverageScore: number | null;
};

const formatValue = (value: number | null, suffix = "") =>
  value === null ? "-" : `${value.toFixed(2)}${suffix}`;

const columns = (th: (key: string) => string, canEdit: boolean) => {
  const baseColumns = [
    { header: th("student"), accessor: "student" },
    {
      header: th("class"),
      accessor: "class",
      className: "hidden md:table-cell",
    },
    { header: th("assessmentCount"), accessor: "assessmentCount" },
    { header: th("averageScore"), accessor: "averageScore" },
    { header: th("status"), accessor: "status" },
  ];

  if (canEdit) {
    baseColumns.push({ header: th("actions"), accessor: "actions" });
  }

  return baseColumns;
};

const statusBadgeVariant: Record<FinalResultStatus, BadgeProps["variant"]> = {
  PASS: "success",
  FAIL: "destructive",
  NO_RESULTS: "secondary",
  NOT_UPDATED: "warning",
};

const AverageBadge = ({ value }: { value: number | null }) => (
  <Badge variant="primary" size="sm" className="font-bold">
    {formatValue(value, "%")}
  </Badge>
);

const StatusBadge = ({
  status,
  statusT,
}: {
  status: FinalResultStatus;
  statusT: (key: FinalResultStatus) => string;
}) => (
  <Badge variant={statusBadgeVariant[status] || "secondary"} size="sm">
    {statusT(status)}
  </Badge>
);

const renderRow = (
  item: FinalResultRow,
  statusT: (key: FinalResultStatus) => string,
  academicYearId: number,
  canEdit: boolean,
) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
      {item.name}
    </td>
    <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-400">
      {item.className}
    </td>
    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
      {item.assessmentCount}
    </td>
    <td className="px-4 py-3">
      <AverageBadge value={item.averageScore} />
    </td>
    <td className="px-4 py-3">
      <StatusBadge status={item.status} statusT={statusT} />
    </td>
    {canEdit && (
      <td className="px-4 py-3">
        <FinalGradeEditButton
          studentId={item.id}
          studentName={item.name}
          academicYearId={academicYearId}
          averageScore={item.storedAverageScore ?? item.averageScore}
        />
      </td>
    )}
  </tr>
);

export default async function FinalResultsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const statusT = await getTranslations("finalResultStatus");
  const { role, userId, schoolId } = await enforceRouteAccess(
    "/list/final-results",
  );
  const resolvedSearchParams = await searchParams;
  const pageParam = getQueryParam(resolvedSearchParams.page);
  const search = getQueryParam(resolvedSearchParams.search);
  const classIdParam = getQueryParam(resolvedSearchParams.classId);
  const gradeIdParam = getQueryParam(resolvedSearchParams.gradeId);
  const academicYearParam = getQueryParam(resolvedSearchParams.academicYearId);
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const classId = classIdParam ? Number.parseInt(classIdParam, 10) : null;
  const gradeId = gradeIdParam ? Number.parseInt(gradeIdParam, 10) : null;
  const currentAcademicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!currentAcademicYearId) return <NoCurrentAcademicYearMessage />;

  const academicYears =
    role === "student" || role === "parent"
      ? await getAcademicYears(schoolId)
      : [];
  const selectedAcademicYearId = academicYearParam
    ? Number.parseInt(academicYearParam, 10)
    : currentAcademicYearId;
  const academicYearId =
    Number.isNaN(selectedAcademicYearId) || selectedAcademicYearId < 1
      ? currentAcademicYearId
      : selectedAcademicYearId;

  const conditions: Prisma.StudentWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (classId && !Number.isNaN(classId)) conditions.push({ classId });
  if (gradeId && !Number.isNaN(gradeId)) {
    conditions.push({ class: { gradeId } });
  }

  if (role === "teacher") {
    conditions.push({
      class: {
        supervisorId: userId,
      },
    });
  } else if (role === "student") {
    conditions.push({ id: userId });
  } else if (role === "parent") {
    conditions.push({ parentId: userId });
  } else if (role !== "admin") {
    conditions.push({ id: "__forbidden__" });
  }

  const studentWhere: Prisma.StudentWhereInput = {
    schoolId,
    ...(conditions.length ? { AND: conditions } : {}),
  };
  const classWhere: Prisma.ClassWhereInput = { schoolId };
  if (role === "teacher") {
    classWhere.supervisorId = userId;
  }

  const [students, count, classes, grades] = await prisma.$transaction([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, name: true, class: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: (currentPage - 1) * ITEM_PER_PAGE,
    }),
    prisma.student.count({ where: studentWhere }),
    prisma.class.findMany({
      where: classWhere,
      select: { id: true, name: true, gradeId: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: { schoolId },
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  const studentIds = students.map((student) => student.id);
  const results = studentIds.length
    ? await prisma.result.findMany({
        where: { schoolId, academicYearId, studentId: { in: studentIds } },
        select: {
          studentId: true,
          score: true,
          assignment: { select: { maxScore: true } },
          exam: { select: { questions: { select: { points: true } } } },
        },
      })
    : [];

  const storedFinalResults = studentIds.length
    ? await prisma.studentFinalResult.findMany({
        where: { schoolId, academicYearId, studentId: { in: studentIds } },
        select: {
          studentId: true,
          averageScore: true,
          assessmentCount: true,
          status: true,
        },
      })
    : [];

  const scoresByStudent = new Map<string, AssessmentScore[]>();
  const storedStatusByStudent = new Map<string, FinalResultStatus>(
    storedFinalResults.map((result) => [
      result.studentId,
      result.status === "PASS" || result.status === "FAIL"
        ? result.status
        : "NOT_UPDATED",
    ]),
  );
  const storedFinalResultByStudent = new Map(
    storedFinalResults.map((result) => [result.studentId, result]),
  );

  for (const result of results) {
    const maxScore =
      result.assignment?.maxScore ??
      result.exam?.questions.reduce(
        (sum, question) => sum + question.points,
        0,
      ) ??
      null;
    const scores = scoresByStudent.get(result.studentId) ?? [];
    scores.push({ score: result.score, maxScore });
    scoresByStudent.set(result.studentId, scores);
  }

  const data: FinalResultRow[] = students.map((student) => {
    const summary = calculateFinalResultSummary(
      scoresByStudent.get(student.id) ?? [],
    );
    const storedFinalResult = storedFinalResultByStudent.get(student.id);
    const hasStoredFinalResult = !!storedFinalResult;
    const averageScore =
      storedFinalResult?.averageScore ?? summary.averageScore;
    const assessmentCount =
      storedFinalResult?.assessmentCount ?? summary.assessmentCount;

    return {
      id: student.id,
      name: student.name,
      className: student.class.name,
      averageScore,
      assessmentCount,
      storedAverageScore: storedFinalResult?.averageScore ?? null,
      status:
        !hasStoredFinalResult && summary.assessmentCount === 0
          ? "NO_RESULTS"
          : (storedStatusByStudent.get(student.id) ?? "NOT_UPDATED"),
    };
  });
  const canEdit = role === "admin" || role === "teacher";

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader title={t("finalAverages")} count={count} />

      <DataPageToolbar
        search={<TableSearch />}
        filters={
          <>
            {(role === "student" || role === "parent") && (
              <AcademicYearFilter
                academicYears={academicYears}
                currentAcademicYearId={currentAcademicYearId}
              />
            )}
            {role === "admin" && (
              <>
                <GradeFilter grades={grades} />
                <ClassFilter classes={classes} />
              </>
            )}
          </>
        }
      />

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <EmptyState
              title={emptyT("finalAverages")}
              description={emptyT("filterDescription")}
              className="w-full max-w-lg border-dashed bg-slate-50/40 dark:bg-slate-900/30"
            />
          </div>
        ) : (
          data.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 shadow-2xs p-4 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-xs">
                    {th("class")}: {item.className}
                  </p>
                </div>
                <StatusBadge status={item.status} statusT={statusT} />
              </div>

              <div className="gap-2 grid grid-cols-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {th("assessmentCount")}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {item.assessmentCount}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {th("averageScore")}
                  </p>
                  <div className="mt-1">
                    <AverageBadge value={item.averageScore} />
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="pt-1">
                  <FinalGradeEditButton
                    studentId={item.id}
                    studentName={item.name}
                    academicYearId={academicYearId}
                    averageScore={item.storedAverageScore ?? item.averageScore}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block">
        <Table
          columns={columns(th, canEdit)}
          renderRow={(item) =>
            renderRow(item, statusT, academicYearId, canEdit)
          }
          data={data}
          emptyTitle={emptyT("finalAverages")}
          emptyDescription={emptyT("filterDescription")}
        />
      </div>

      <Pagination page={currentPage} count={count} />
    </div>
  );
}
