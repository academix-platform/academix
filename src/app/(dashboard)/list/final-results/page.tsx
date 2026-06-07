import AcademicYearFilter from "@/components/AcademicYearFilter";
import ClassFilter from "@/components/ClassFilter";
import FinalGradeEditButton from "@/components/FinalGradeEditButton";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
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

type StoredFinalResult = {
  studentId: string;
  averageScore: number;
  assessmentCount: number;
  status: string | null;
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

const statusClassName: Record<FinalResultStatus, string> = {
  PASS: "bg-emerald-50 text-emerald-700",
  FAIL: "bg-red-50 text-red-700",
  NO_RESULTS: "bg-gray-100 text-gray-500",
  NOT_UPDATED: "bg-amber-50 text-amber-700",
};

const renderRow = (
  item: FinalResultRow,
  statusT: (key: FinalResultStatus) => string,
  academicYearId: number,
  canEdit: boolean,
) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="p-4 font-medium text-gray-900">{item.name}</td>
    <td className="hidden md:table-cell">{item.className}</td>
    <td>{item.assessmentCount}</td>
    <td>
      <span className="inline-flex items-center rounded-md bg-academixSkyLight px-2 py-1 font-semibold text-academixPurpleDark">
        {formatValue(item.averageScore, "%")}
      </span>
    </td>
    <td>
      <span
        className={`inline-flex items-center rounded-md px-2 py-1 font-medium ${statusClassName[item.status]}`}
      >
        {statusT(item.status)}
      </span>
    </td>
    {canEdit && (
      <td>
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
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/final-results");
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
    role === "student" || role === "parent" ? await getAcademicYears(schoolId) : [];
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
      select: { id: true, name: true },
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
  const storedFinalResults: StoredFinalResult[] = studentIds.length
    ? await (
        prisma as unknown as {
          studentFinalResult: {
            findMany: (args: {
              where: {
                schoolId: number;
                academicYearId: number;
                studentId: { in: string[] };
              };
              select: {
                studentId: boolean;
                averageScore: boolean;
                assessmentCount: boolean;
                status: boolean;
              };
            }) => Promise<StoredFinalResult[]>;
          };
        }
      ).studentFinalResult.findMany({
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
      result.exam?.questions.reduce((sum, question) => sum + question.points, 0) ??
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
    const averageScore = storedFinalResult?.averageScore ?? summary.averageScore;
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
          : storedStatusByStudent.get(student.id) ?? "NOT_UPDATED",
    };
  });
  const canEdit = role === "admin" || role === "teacher";

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("finalAverages")}</h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
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
        </div>
      </div>
      <Table
        columns={columns(th, canEdit)}
        renderRow={(item) => renderRow(item, statusT, academicYearId, canEdit)}
        data={data}
        emptyTitle={emptyT("finalAverages")}
        emptyDescription={emptyT("filterDescription")}
      />
      <Pagination page={currentPage} count={count} />
    </div>
  );
}
