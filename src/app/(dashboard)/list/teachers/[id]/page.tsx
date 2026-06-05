import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import UserActionButtons from "@/components/UserActionButtons";
import AttendanceCard from "@/components/AttendanceCard";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  BookOpen,
  Calendar,
  CalendarCheck2,
  Droplet,
  GraduationCap,
  Mail,
  Phone,
  School,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

const SingleTeacherPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const t = await getTranslations("profilePages");
  const { id } = await params;

  const { role, schoolId } = await enforceRouteAccess(`/list/teachers`);

  const where: Prisma.TeacherWhereInput = {
    id,
    schoolId,
  };

  const teacher = await prisma.teacher.findFirst({
    where,
    include: {
      subjects: true,
      _count: {
        select: {
          subjects: true,
          lessons: true,
          classes: true,
        },
      },
    },
  });

  if (!teacher) {
    return notFound();
  }

  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-3/4">
        {/* TOP */}
        <div className="flex flex-wrap md:flex-nowrap gap-4">
          {/* USER INFO CARD */}
          <div className="relative flex sm:flex-row flex-col md:justify-between gap-4 bg-academixSky px-4 py-6 rounded-md w-full md:w-2/3">
            <div className="top-3 absolute flex items-center gap-2 end-3">
              {role === "admin" && (
                <FormContainer table="teacher" type="update" data={teacher} />
              )}
              <UserActionButtons
                table="teacher"
                userId={teacher.id}
                userName={teacher.name}
              />
            </div>

            <div className="rounded-full">
              <Image
                src={teacher.img || "/avatar.png"}
                alt=""
                width={144}
                height={144}
                className="rounded-full w-24 md:w-36 h-24 md:h-36 object-cover"
              />
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <h1 className="font-semibold text-xl">{teacher.name}</h1>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 font-medium text-xs">
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Droplet className="w-4 h-4 text-gray-600" />
                  <span>{teacher.bloodType}</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span>
                    {new Intl.DateTimeFormat("en-US").format(teacher.birthday)}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span>{teacher.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span>{teacher.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="gap-4 grid grid-cols-2 w-full md:w-1/3">
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <CalendarCheck2 className="w-6 h-6 text-academixPurpleDark" />
                <Suspense fallback="Loading...">
                  <AttendanceCard id={id} scope="teacher" />
                </Suspense>
              </div>
              <span className="text-gray-400 text-sm">
                {t("cards.attendance")}
              </span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <GraduationCap className="w-6 h-6 text-academixPurpleDark" />
                <h1 className="font-semibold text-xl">
                  {teacher._count.subjects}
                </h1>
              </div>
              <span className="text-gray-400 text-sm">
                {t("cards.subjects")}
              </span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <BookOpen className="w-6 h-6 text-academixPurpleDark" />
                <h1 className="font-semibold text-xl">
                  {teacher._count.lessons}
                </h1>
              </div>
              <span className="text-gray-400 text-sm">
                {t("cards.lessons")}
              </span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <School className="w-6 h-6 text-academixPurpleDark" />
                <h1 className="font-semibold text-xl">
                  {teacher._count.classes}
                </h1>
              </div>
              <span className="text-gray-400 text-sm">
                {t("cards.classes")}
              </span>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="bg-white mt-4 p-4 rounded-md h-[800px]">
          <h1>{t("teacher.schedule")}</h1>
          <BigCalendarContainer type="teacherId" id={id} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-4 w-full xl:w-1/4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="font-semibold text-xl">{t("shortcuts.title")}</h1>
          <div className="flex flex-col gap-2 mt-4 text-gray-500 text-xs">
            <Link
              className="bg-academixSkyLight p-3 rounded-md hover:font-bold hover:scale-[1.05] transition-all"
              href={`/list/classes?teacherId=${id}`}
            >
              {t("teacher.classes")}
            </Link>
            <Link
              className="bg-academixPurpleLight p-3 rounded-md hover:font-bold hover:scale-[1.05] transition-all"
              href={`/list/students?teacherId=${id}`}
            >
              {t("teacher.students")}
            </Link>
            <Link
              className="bg-pink-50 p-3 rounded-md hover:font-bold hover:scale-[1.05] transition-all"
              href={`/list/exams?teacherId=${id}`}
            >
              {t("teacher.exams")}
            </Link>
            <Link
              className="bg-academixSkyLight p-3 rounded-md hover:font-bold hover:scale-[1.05] transition-all"
              href={`/list/assignments?teacherId=${id}`}
            >
              {t("teacher.assignments")}
            </Link>
          </div>
        </div>
        <Announcements />
      </div>
    </div>
  );
};

export default SingleTeacherPage;
