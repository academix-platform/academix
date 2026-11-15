import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ElementType, ReactNode } from "react";
import {
  BookOpen,
  Users,
  ClipboardList,
  FileText,
  GraduationCap,
  Info,
  Calendar,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import {
  subjectAccessWhere,
  subjectClassContentWhere,
  subjectMaterialWhere,
} from "@/lib/subjects/access";
import StudyMaterialList, {
  StudyMaterialItem,
} from "@/components/StudyMaterialList";
import SubjectPageEditor from "@/components/SubjectPageEditor";
import SubjectDetailsTabs from "@/components/SubjectDetailsTabs";
import FormContainer from "@/components/FormContainer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number | string;
  tint: "blue" | "emerald" | "amber" | "purple";
}) {
  const tintStyles = {
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40",
    amber:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40",
    purple:
      "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40",
  };

  return (
    <div className="bg-surface border border-outline/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-content-muted block truncate">
          {label}
        </span>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-content-primary tabular-nums">
          {value}
        </div>
      </div>
      <div
        className={cn(
          "p-2.5 sm:p-3 rounded-xl border shrink-0",
          tintStyles[tint],
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ─── Section renderers ────────────────────────────────────────────────────────
function AssignmentsSection({
  assignments,
  createAction,
  emptyLabel,
  labels,
  locale = "ar",
}: {
  assignments: {
    id: number;
    title: string;
    description: string | null;
    endDate: Date;
    fileUrl: string | null;
    class: { name: string } | null;
    lesson: { class: { name: string } } | null;
  }[];
  createAction?: ReactNode;
  emptyLabel: string;
  labels: {
    assignments: string;
    manageAssignments: string;
    class: string;
    due: string;
    overdue: string;
    download: string;
    downloadAssignmentFile: string;
  };
  locale?: string;
}) {
  return (
    <div className="bg-surface border border-outline/80 rounded-2xl shadow-2xs overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline/60 bg-surface-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-content-primary text-sm sm:text-base">
            {labels.assignments}
          </h2>
          <Badge variant="secondary" size="sm">
            {assignments.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/list/assignments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brandPurple-600 dark:text-brandPurple-400 hover:text-brandPurple-700 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-muted"
          >
            {labels.manageAssignments}
          </Link>
          {createAction}
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <ClipboardList className="mx-auto mb-2 w-10 h-10 text-content-muted/60" />
          <p className="text-xs sm:text-sm font-medium text-content-muted">
            {emptyLabel}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-outline/40 max-h-[380px] overflow-auto">
          {assignments.map((a) => {
            const isOverdue = new Date(a.endDate) < new Date() && !a.fileUrl;
            return (
              <li
                key={a.id}
                className="flex justify-between items-start gap-4 hover:bg-surface-muted/30 px-5 py-3.5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content-primary text-sm truncate">
                    {a.title}
                  </p>
                  {a.description && (
                    <p className="mt-0.5 text-content-secondary text-xs sm:text-sm line-clamp-1">
                      {a.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-content-muted text-xs">
                    <span>
                      {labels.class}: {a.class?.name ?? a.lesson?.class.name ?? "-"}
                    </span>
                    <span>·</span>
                    <span>
                      {labels.due}:{" "}
                      {new Date(a.endDate).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" size="sm">
                        {labels.overdue}
                      </Badge>
                    )}
                  </div>
                </div>
                {a.fileUrl && (
                  <a
                    href={`/api/download/${a.id}?type=assignment`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={labels.downloadAssignmentFile}
                    className="flex shrink-0 items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-lg font-semibold text-amber-700 dark:text-amber-300 text-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{labels.download}</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ExamsSection({
  exams,
  createAction,
  tableHeaders,
  labels,
  locale = "ar",
}: {
  exams: {
    id: number;
    title: string;
    startTime: Date;
    endTime: Date;
    class: { name: string } | null;
  }[];
  createAction?: ReactNode;
  tableHeaders: {
    title: string;
    class: string;
    startTime: string;
    endTime: string;
  };
  labels: {
    exams: string;
    manageExams: string;
    noExams: string;
  };
  locale?: string;
}) {
  return (
    <div className="bg-surface border border-outline/80 rounded-2xl shadow-2xs overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline/60 bg-surface-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-content-primary text-sm sm:text-base">
            {labels.exams}
          </h2>
          <Badge variant="secondary" size="sm">
            {exams.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/list/exams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brandPurple-600 dark:text-brandPurple-400 hover:text-brandPurple-700 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-muted"
          >
            {labels.manageExams}
          </Link>
          {createAction}
        </div>
      </div>
      {exams.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <FileText className="mx-auto mb-2 w-10 h-10 text-content-muted/60" />
          <p className="text-xs sm:text-sm font-medium text-content-muted">
            {labels.noExams}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs sm:text-sm text-start">
            <thead>
              <tr className="bg-surface-muted/40 border-b border-outline/60 text-content-muted font-semibold text-[11px] sm:text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-start font-semibold">
                  {tableHeaders.title}
                </th>
                <th className="px-5 py-3 text-start font-semibold">
                  {tableHeaders.class}
                </th>
                <th className="px-5 py-3 text-start font-semibold">
                  {tableHeaders.startTime}
                </th>
                <th className="px-5 py-3 text-start font-semibold">
                  {tableHeaders.endTime}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/40">
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className="hover:bg-surface-muted/30 transition-colors"
                >
                  <td className="px-5 py-3 font-semibold text-content-primary">
                    {exam.title}
                  </td>
                  <td className="px-5 py-3 text-content-secondary">
                    {exam.class?.name ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-content-secondary tabular-nums">
                    {new Date(exam.startTime).toLocaleString(locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 text-content-secondary tabular-nums">
                    {new Date(exam.endTime).toLocaleString(locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const subjectT = await getTranslations("subjectDetails");
  const commonT = await getTranslations("common");
  const locale = await getLocale();
  const { id } = await params;
  const subjectId = Number(id);
  if (isNaN(subjectId)) notFound();

  const { userId, role, schoolId } = await requireAuth();
  const roleStr = role as string;
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  // Class content filtering
  const classContentWhere = subjectClassContentWhere(
    roleStr,
    userId,
    academicYearId,
  );

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      schoolId,
      ...subjectAccessWhere(roleStr, userId),
    },
    include: {
      grade: { select: { level: true } },
      teachers: {
        select: { id: true, name: true, img: true },
      },
      studyMaterials: {
        where: subjectMaterialWhere(academicYearId),
        include: {
          teacher: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        where: classContentWhere,
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          fileUrl: true,
          fileName: true,
          class: { select: { name: true } },
          lesson: {
            select: { class: { select: { name: true } } },
          },
        },
        orderBy: { id: "desc" },
      },
      exams: {
        where: classContentWhere,
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          class: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
      },
      pageSettings:
        roleStr === "teacher" && userId
          ? { where: { teacherId: userId }, take: 1 }
          : { take: 1 },
    },
  });

  if (!subject) notFound();

  const classCount = new Set([
    ...subject.assignments
      .map(
        (assignment) =>
          assignment.class?.name ?? assignment.lesson?.class.name,
      )
      .filter((className): className is string => !!className),
    ...subject.exams
      .map((exam) => exam.class?.name)
      .filter((className): className is string => !!className),
  ]).size;

  const materials: StudyMaterialItem[] = subject.studyMaterials.map((m) => ({
    ...m,
    createdAt: new Date(m.createdAt),
  }));

  const pageSettings = subject.pageSettings[0] ?? null;
  const sectionsOrder: string[] = (
    (pageSettings?.sectionsOrder as string[]) ?? [
      "materials",
      "assignments",
      "exams",
    ]
  ).map((section) => (section === "lessons" ? "exams" : section));

  const isAuthorized = roleStr === "teacher" || roleStr === "admin";

  const sectionMap: Record<string, ReactNode> = {
    assignments: (
      <AssignmentsSection
        locale={locale}
        assignments={subject.assignments}
        emptyLabel={emptyT("assignments")}
        labels={{
          assignments: subjectT("assignments"),
          manageAssignments: subjectT("manageAssignments"),
          class: subjectT("class"),
          due: subjectT("due"),
          overdue: subjectT("overdue"),
          download: subjectT("download"),
          downloadAssignmentFile: subjectT("downloadAssignmentFile"),
        }}
        createAction={
          isAuthorized ? (
            <FormContainer
              table="assignment"
              type="create"
              data={{
                subjectId,
                subjectName: subject.name,
                lockSubject: true,
              }}
            />
          ) : undefined
        }
      />
    ),
    exams: (
      <ExamsSection
        exams={subject.exams}
        locale={locale}
        labels={{
          exams: subjectT("exams"),
          manageExams: subjectT("manageExams"),
          noExams: subjectT("noExams"),
        }}
        tableHeaders={{
          title: th("title"),
          class: th("class"),
          startTime: th("startTime"),
          endTime: th("endTime"),
        }}
        createAction={
          isAuthorized ? (
            <Link
              href={`/list/exams/create-workflow?subjectId=${subjectId}`}
              className="inline-flex items-center gap-1.5 bg-brandPurple-600 hover:bg-brandPurple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              {subjectT("createExam")}
            </Link>
          ) : undefined
        }
      />
    ),
    materials: (
      <StudyMaterialList
        materials={materials}
        subjectId={subjectId}
        currentUserId={userId ?? undefined}
        role={roleStr}
      />
    ),
  };

  const breadcrumbs = [
    {
      label: commonT("dashboard"),
      href: `/${roleStr}`,
    },
    {
      label: subjectT("subjects"),
      href: "/list/subjects",
    },
    {
      label: subject.name,
      isCurrent: true,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      {/* Banner Image */}
      {pageSettings?.bannerImage && (
        <div
          className={`relative w-full rounded-2xl overflow-hidden shadow-2xs border border-outline ${
            pageSettings.bannerHeight === "sm"
              ? "h-32"
              : pageSettings.bannerHeight === "lg"
                ? "h-72"
                : "h-48"
          }`}
        >
          <Image
            src={pageSettings.bannerImage}
            alt={`${subject.name} banner`}
            fill
            unoptimized
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-outline/80 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-brandPurple-50 dark:bg-brandPurple-950/40 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100/80 dark:border-brandPurple-900/60 flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold text-xl sm:text-2xl text-content-primary tracking-tight">
                {subject.name}
              </h1>
              <Badge variant="outline" className="font-semibold bg-surface-muted/40">
                {subjectT("gradeLevel", { level: subject.grade.level })}
              </Badge>
              <Badge variant="secondary" className="font-semibold">
                {subjectT("teacherCount", { count: subject.teachers.length })}
              </Badge>
            </div>
            {pageSettings?.description && (
              <p className="text-content-secondary text-xs sm:text-sm leading-relaxed max-w-2xl">
                {pageSettings.description}
              </p>
            )}
          </div>
        </div>

        {/* Edit Page button — teachers/admins */}
        {isAuthorized && (
          <div className="shrink-0 self-start md:self-center">
            <SubjectPageEditor
              subjectId={subjectId}
              initialSettings={{
                announcement: pageSettings?.announcement ?? null,
                description: pageSettings?.description ?? null,
                bannerImage: pageSettings?.bannerImage ?? null,
                bannerHeight: pageSettings?.bannerHeight ?? "md",
                sectionsOrder,
              }}
            />
          </div>
        )}
      </div>

      {/* Announcement banner */}
      {pageSettings?.announcement && (
        <div className="bg-brandPurple-50/70 dark:bg-brandPurple-950/30 px-5 py-3.5 border border-brandPurple-200/70 dark:border-brandPurple-800/50 rounded-2xl font-medium text-brandPurple-800 dark:text-brandPurple-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-2xs">
          <span className="text-base shrink-0">📢</span>
          <span>{pageSettings.announcement}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          icon={Users}
          label={subjectT("teachers")}
          value={subject.teachers.length}
          tint="blue"
        />
        <StatCard
          icon={GraduationCap}
          label={subjectT("classes")}
          value={classCount}
          tint="emerald"
        />
        <StatCard
          icon={ClipboardList}
          label={subjectT("assignments")}
          value={subject.assignments.length}
          tint="amber"
        />
        <StatCard
          icon={FileText}
          label={subjectT("exams")}
          value={subject.exams.length}
          tint="purple"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3): Tabs & Content */}
        <div className="space-y-6 lg:col-span-2">
          <SubjectDetailsTabs
            sectionsOrder={sectionsOrder}
            assignmentsContent={sectionMap.assignments}
            examsContent={sectionMap.exams}
            materialsContent={sectionMap.materials}
          />
        </div>

        {/* Right column (1/3): Info Card + Teachers */}
        <div className="space-y-6">
          {/* Subject info card with clear key-value layout */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-outline/60">
              <Info className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
              <h3 className="font-bold text-sm text-content-primary">
                {subjectT("subjectInfo")}
              </h3>
            </div>
            <div className="space-y-2 text-xs sm:text-sm divide-y divide-outline/40">
              <div className="flex items-center justify-between pt-2 first:pt-0">
                <span className="text-content-muted font-medium">
                  {subjectT("grade")}
                </span>
                <span className="font-semibold text-content-primary">
                  {subjectT("gradeLevel", { level: subject.grade.level })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-content-muted font-medium">
                  {subjectT("classes")}
                </span>
                <span className="font-semibold text-content-primary tabular-nums">
                  {classCount}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-content-muted font-medium">
                  {subjectT("assignments")}
                </span>
                <span className="font-semibold text-content-primary tabular-nums">
                  {subject.assignments.length}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-content-muted font-medium">
                  {subjectT("materials")}
                </span>
                <span className="font-semibold text-content-primary tabular-nums">
                  {subject.studyMaterials.length}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-content-muted font-medium">
                  {subjectT("exams")}
                </span>
                <span className="font-semibold text-content-primary tabular-nums">
                  {subject.exams.length}
                </span>
              </div>
            </div>
          </div>

          {/* Teachers Section */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-outline/60">
              <Users className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
              <h3 className="font-bold text-sm text-content-primary">
                {roleStr === "student"
                  ? subjectT("yourTeachers", {
                      count: subject.teachers.length,
                    })
                  : subjectT("teachers")}
              </h3>
            </div>

            {subject.teachers.length === 0 ? (
              <p className="text-xs text-content-muted font-medium py-2">
                {emptyT("teachersAssigned")}
              </p>
            ) : (
              <ul className="space-y-3">
                {subject.teachers.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-muted/40 transition-colors"
                  >
                    {t.img ? (
                      <Image
                        src={t.img}
                        alt={t.name}
                        width={36}
                        height={36}
                        className="rounded-full w-9 h-9 object-cover border border-outline shrink-0"
                      />
                    ) : (
                      <div className="flex shrink-0 justify-center items-center bg-brandPurple-100 dark:bg-brandPurple-950/60 text-brandPurple-700 dark:text-brandPurple-300 rounded-full w-9 h-9 font-bold text-xs border border-brandPurple-200/50">
                        {t.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-content-primary text-sm truncate">
                        {t.name}
                      </p>
                      <p className="text-content-muted text-xs">
                        {subjectT("subjectTeacher")}
                      </p>
                    </div>
                    {roleStr === "admin" && (
                      <Link
                        href={`/list/teachers/${t.id}`}
                        className="text-xs font-semibold text-brandPurple-600 dark:text-brandPurple-400 hover:text-brandPurple-700 transition-colors shrink-0"
                      >
                        {subjectT("viewDetails")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
