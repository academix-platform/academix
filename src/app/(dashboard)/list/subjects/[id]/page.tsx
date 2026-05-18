import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ElementType } from "react";
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
import StudyMaterialUpload from "@/components/StudyMaterialUpload";
import StudyMaterialList, {
  StudyMaterialItem,
} from "@/components/StudyMaterialList";

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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Day label map ────────────────────────────────────────────────────────────
const dayLabel: Record<string, string> = {
  SATURDAY: "Sat",
  SUNDAY: "Sun",
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subjectId = Number(id);
  if (isNaN(subjectId)) notFound();

  const { userId, role, schoolId } = await requireAuth();

  // schoolId من الـ helper الموجود في المشروع

  // ── جلب المادة مع كل البيانات ─────────────────────────────────────────────
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId },
    include: {
      grade: { select: { level: true } },
      teachers: {
        select: { id: true, name: true, img: true },
      },
      lessons: {
        select: {
          id: true,
          name: true,
          day: true,
          startTime: true,
          endTime: true,
          class: { select: { name: true } },
        },
        orderBy: { day: "asc" },
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
          lesson: {
            select: { class: { select: { name: true } } },
          },
        },
        orderBy: { endDate: "asc" },
      },
      exams: {
        select: { id: true },
      },
    },
  });

  if (!subject) notFound();

  // عدد الصفوف الفريدة
  const classCount = new Set(subject.lessons.map((l) => l.class.name)).size;

  // تحويل النوع ليناسب مكون StudyMaterialList
  const materials: StudyMaterialItem[] = subject.studyMaterials.map((m) => ({
    ...m,
    createdAt: new Date(m.createdAt),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link
          href="/list/subjects"
          className="hover:text-purple-600 transition-colors"
        >
          Subjects
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-800 font-medium">{subject.name}</span>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
        <div className="p-4 bg-purple-100 rounded-xl">
          <BookOpen className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{subject.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Grade {subject.grade.level} ·{" "}
            {subject.teachers.length} teacher
            {subject.teachers.length !== 1 ? "s" : ""} ·{" "}
            {subject.lessons.length} lesson
            {subject.lessons.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          color="bg-red-500"
        />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Teachers */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Teachers
            </h2>
            {subject.teachers.length === 0 ? (
              <p className="text-gray-400 text-sm">No teachers assigned yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {subject.teachers.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/list/teachers/${t.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg
                                 border border-gray-100 hover:border-purple-200
                                 hover:bg-purple-50 transition-colors"
                    >
                      {t.img ? (
                        <Image
                          src={t.img}
                          alt={t.name}
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center
                                        justify-center text-purple-700 font-semibold text-xs">
                          {t.name[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {t.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              <h2 className="text-base font-semibold text-gray-800">
                Assignments
              </h2>
              <span className="ml-1 text-sm text-gray-400">
                ({subject.assignments.length})
              </span>
            </div>

            {subject.assignments.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-400 text-sm">No assignments yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {subject.assignments.map((a) => {
                  const isOverdue =
                    new Date(a.endDate) < new Date() && !a.fileUrl;
                  return (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-4 px-6 py-4
                                 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {a.title}
                        </p>
                        {a.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {a.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>
                            Class: {a.lesson.class.name}
                          </span>
                          <span>·</span>
                          <span>
                            Due:{" "}
                            {new Date(a.endDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          {isOverdue && (
                            <span className="text-red-500 font-medium">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      {/* زر التحميل — لجميع المستخدمين إن وُجد ملف */}
                      {a.fileUrl && (
                        <a
                          href={a.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={a.fileName ?? true}
                          title="Download assignment file"
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5
                                     bg-orange-50 text-orange-700 hover:bg-orange-100
                                     rounded-lg text-xs font-medium transition-colors"
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

          {/* Lessons Schedule */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-500" />
              <h2 className="text-base font-semibold text-gray-800">
                Lessons Schedule
              </h2>
            </div>

            {subject.lessons.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-400 text-sm">No lessons scheduled.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 bg-gray-50">
                      <th className="px-6 py-3 font-medium">Lesson</th>
                      <th className="px-6 py-3 font-medium">Class</th>
                      <th className="px-6 py-3 font-medium">Day</th>
                      <th className="px-6 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subject.lessons.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-800">
                          {l.name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {l.class.name}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {dayLabel[l.day] ?? l.day}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(l.startTime).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {new Date(l.endTime).toLocaleTimeString("en-GB", {
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

          {/* Study Materials List */}
          <StudyMaterialList
            materials={materials}
            subjectId={subjectId}
            currentUserId={userId ?? undefined}
            role={role}
          />
        </div>

        {/* ── Right column (1/3) ────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* فورم الرفع — للمعلم فقط */}
          {role === "teacher" && (
            <StudyMaterialUpload subjectId={subjectId} />
          )}

          {/* Subject info card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
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
                <dt className="text-gray-500">Lessons</dt>
                <dd className="font-medium text-gray-700">
                  {subject.lessons.length}
                </dd>
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

        </div>
      </div>
    </div>
  );
}
