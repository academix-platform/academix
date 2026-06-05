import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ElementType, ReactNode } from "react";
import {
  BookOpen,
  Users,
  ClipboardList,
  FileText,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import StudyMaterialList, {
  StudyMaterialItem,
} from "@/components/StudyMaterialList";
import SubjectPageEditor from "@/components/SubjectPageEditor";
import SubjectDetailsTabs from "@/components/SubjectDetailsTabs";
import FormContainer from "@/components/FormContainer";
import { getTranslations } from "next-intl/server";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="font-bold text-gray-800 text-2xl">{value}</p>
        <p className="text-gray-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

// ─── Day label map ────────────────────────────────────────────────────────────
// ─── Section renderers ────────────────────────────────────────────────────────
function AssignmentsSection({
  assignments,
  createAction,
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
}) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-xl h-[300px] overflow-auto">
      <div className="flex justify-between items-center px-6 py-4 border-gray-100 border-b">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-gray-800 text-base">Assignments</h2>
          <span className="ml-1 text-gray-400 text-sm">
            ({assignments.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/list/assignments"
            className="bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-md text-white text-sm transition-colors"
          >
            Manage Assignments
          </Link>
          {createAction}
        </div>
      </div>
      {assignments.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-400 text-sm">No assignments yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {assignments.map((a) => {
            const isOverdue = new Date(a.endDate) < new Date() && !a.fileUrl;
            return (
              <li
                key={a.id}
                className="flex justify-between items-start gap-4 hover:bg-gray-50 px-6 py-4 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {a.title}
                  </p>
                  {a.description && (
                    <p className="mt-0.5 text-gray-500 text-sm line-clamp-1">
                      {a.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-gray-400 text-xs">
                    <span>Class: {a.class?.name ?? a.lesson?.class.name ?? "-"}</span>
                    <span>·</span>
                    <span>
                      Due:{" "}
                      {new Date(a.endDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {isOverdue && (
                      <span className="font-medium text-red-500">Overdue</span>
                    )}
                  </div>
                </div>
                {a.fileUrl && (
                  <a
                    href={`/api/download/${a.id}?type=assignment`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download assignment file"
                    className="flex flex-shrink-0 items-center gap-1.5 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium text-orange-700 text-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download
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
}) {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-xl h-[300px] overflow-auto">
      <div className="flex justify-between items-center px-6 py-4 border-gray-100 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-yellow-500" />
          <h2 className="font-semibold text-gray-800 text-base">Exams</h2>
          <span className="ml-1 text-gray-400 text-sm">({exams.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/list/exams"
            className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1.5 rounded-md text-white text-sm transition-colors"
          >
            Manage Exams
          </Link>
          {createAction}
        </div>
      </div>
      {exams.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-400 text-sm">No exams scheduled.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-start">
                <th className="px-6 py-3 font-medium">{tableHeaders.title}</th>
                <th className="px-6 py-3 font-medium">{tableHeaders.class}</th>
                <th className="px-6 py-3 font-medium">{tableHeaders.startTime}</th>
                <th className="px-6 py-3 font-medium">{tableHeaders.endTime}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {exam.title}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {exam.class?.name ?? "-"}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {new Date(exam.startTime).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {new Date(exam.endTime).toLocaleString("en-GB", {
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
  const { id } = await params;
  const subjectId = Number(id);
  if (isNaN(subjectId)) notFound();

  const { userId, role, schoolId } = await requireAuth();
  const roleStr = role as string;

  // جلب المادة مع كل البيانات + إعدادات الصفحة
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
    include: {
      grade: { select: { level: true } },
      teachers: {
        select: { id: true, name: true, img: true },
      },
      studyMaterials: {
        include: {
          teacher: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
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
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          class: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
      },
      // جلب إعدادات الصفحة — المعلم يجلب إعداداته، الأدمن والطالب يجلبون أول إعداد موجود
      pageSettings:
        roleStr === "teacher" && userId
          ? { where: { teacherId: userId }, take: 1 }
          : { take: 1 },
    },
  });

  if (!subject) notFound();

  const classCount = new Set([
    ...subject.assignments
      .map((assignment) => assignment.class?.name ?? assignment.lesson?.class.name)
      .filter((className): className is string => !!className),
    ...subject.exams
      .map((exam) => exam.class?.name)
      .filter((className): className is string => !!className),
  ]).size;

  const materials: StudyMaterialItem[] = subject.studyMaterials.map((m) => ({
    ...m,
    createdAt: new Date(m.createdAt),
  }));

  // إعدادات الصفحة
  const pageSettings = subject.pageSettings[0] ?? null;
  const sectionsOrder: string[] = (
    (pageSettings?.sectionsOrder as string[]) ?? [
      "materials",
      "assignments",
      "exams",
    ]
  ).map((section) => (section === "lessons" ? "exams" : section));

  const isAuthorized = roleStr === "teacher" || roleStr === "admin"; // الأدمن له نفس صلاحيات المعلم

  // خريطة الأقسام
  const sectionMap: Record<string, ReactNode> = {
    assignments: (
      <AssignmentsSection
        assignments={subject.assignments}
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
              className="inline-flex items-center gap-1.5 bg-academixPurpleDark px-3 py-1.5 rounded-md text-white text-sm hover:scale-[1.05] transition"
            >
              Create Exam
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

  return (
    <div className="space-y-6 bg-gray-50 p-6 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-gray-500 text-sm">
        <Link
          href="/list/subjects"
          className="hover:text-purple-600 transition-colors"
        >
          Subjects
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-gray-800">{subject.name}</span>
      </nav>

      {/* Banner Image */}
      {pageSettings?.bannerImage && (
        <div
          className={`relative w-full rounded-xl overflow-hidden shadow-sm ${
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
      <div className="flex justify-between items-start gap-4 bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="bg-purple-100 p-3 sm:p-4 rounded-xl">
            <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-xl sm:text-2xl">
              {subject.name}
            </h1>
            <p className="mt-1 text-gray-500 text-sm">
              Grade {subject.grade.level} · {subject.teachers.length} teacher
              {subject.teachers.length !== 1 ? "s" : ""}
            </p>
            {/* Course description */}
            {pageSettings?.description && (
              <p className="mt-2 max-w-xl text-gray-600 text-sm">
                {pageSettings.description}
              </p>
            )}
          </div>
        </div>

        {/* Edit Page button — teachers only */}
        {isAuthorized && (
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
        )}
      </div>

      {/* Announcement banner */}
      {pageSettings?.announcement && (
        <div className="bg-purple-50 px-5 py-4 border border-purple-200 rounded-xl font-medium text-purple-800 text-sm">
          📢 {pageSettings.announcement}
        </div>
      )}

      {/* Stats */}
      <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Teachers"
          value={subject.teachers.length}
          color="bg-blue-500"
        />
        <StatCard
          icon={GraduationCap}
          label="Classes"
          value={classCount}
          color="bg-green-500"
        />
        <StatCard
          icon={ClipboardList}
          label="Assignments"
          value={subject.assignments.length}
          color="bg-orange-500"
        />
        <StatCard
          icon={FileText}
          label="Exams"
          value={subject.exams.length}
          color="bg-yellow-500"
        />
      </div>

      {/* Main grid */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SubjectDetailsTabs
            sectionsOrder={sectionsOrder}
            assignmentsContent={sectionMap.assignments}
            examsContent={sectionMap.exams}
            materialsContent={sectionMap.materials}
          />
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6 h-full">
          {/* Subject info card */}
          <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
            <h3 className="mb-3 font-semibold text-gray-700 text-sm">
              Subject Info
            </h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Grade</dt>
                <dd className="font-medium text-gray-700">
                  Grade {subject.grade.level}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Classes</dt>
                <dd className="font-medium text-gray-700">{classCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Assignments</dt>
                <dd className="font-medium text-gray-700">
                  {subject.assignments.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Materials</dt>
                <dd className="font-medium text-gray-700">
                  {subject.studyMaterials.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Exams</dt>
                <dd className="font-medium text-gray-700">
                  {subject.exams.length}
                </dd>
              </div>
            </dl>
          </div>

          {roleStr === "admin" && (
            <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-xl">
              <h2 className="flex items-center gap-2 mb-4 font-semibold text-gray-800 text-base">
                <Users className="w-4 h-4 text-blue-500" />
                Teachers
              </h2>
              {subject.teachers.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No teachers assigned yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-3">
                  {subject.teachers.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/list/teachers/${t.id}`}
                        className="flex items-center gap-2 hover:bg-purple-50 px-3 py-2 border border-gray-100 hover:border-purple-200 rounded-lg transition-colors"
                      >
                        {t.img ? (
                          <Image
                            src={t.img}
                            alt={t.name}
                            width={28}
                            height={28}
                            className="rounded-full w-7 h-7 object-cover"
                          />
                        ) : (
                          <div className="flex justify-center items-center bg-purple-100 rounded-full w-7 h-7 font-semibold text-purple-700 text-xs">
                            {t.name[0]}
                          </div>
                        )}
                        <span className="font-medium text-gray-700 text-sm">
                          {t.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {roleStr === "student" && subject.teachers.length > 0 && (
            <div className="bg-white shadow-sm p-5 border border-gray-100 rounded-xl">
              <h3 className="flex items-center gap-2 mb-4 font-semibold text-gray-700 text-sm">
                <Users className="w-4 h-4 text-blue-500" />
                Your Teacher{subject.teachers.length > 1 ? "s" : ""}
              </h3>
              <ul className="space-y-3">
                {subject.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    {t.img ? (
                      <Image
                        src={t.img}
                        alt={t.name}
                        width={40}
                        height={40}
                        className="flex-shrink-0 rounded-full w-10 h-10 object-cover"
                      />
                    ) : (
                      <div className="flex flex-shrink-0 justify-center items-center bg-purple-100 rounded-full w-10 h-10 font-bold text-purple-700 text-sm">
                        {t.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {t.name}
                      </p>
                      <p className="text-gray-400 text-xs">Subject Teacher</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
