import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import { Class, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const SingleStudentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;

  const user = await enforceRouteAccess(`/list/students/${id}`);

  const role = user.role;
  const userId = user.userId;

  const where: Prisma.StudentWhereInput = {
    id,
  };

  switch (role) {
    case "teacher":
      where.class = {
        lessons: {
          some: {
            teacherId: userId,
          },
        },
      };
      break;

    case "student":
      where.id = userId;
      break;

    case "parent":
      where.parentId = userId;
      break;

    case "admin":
    default:
      break;
  }

  const student = await prisma.student.findFirst({
    where,
    include: {
      class: {
        include: {
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  if (!student) {
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
            <div className="top-5 right-5 absolute bg-white rounded-md">
              {role === "admin" && (
                <FormContainer table="student" type="update" data={student} />
              )}
            </div>

            <div className="rounded-full">
              <Image
                src={student.img || "/avatar.png"}
                alt=""
                width={144}
                height={144}
                className="rounded-full w-24 md:w-36 h-24 md:h-36 object-cover"
              />
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <h1 className="font-semibold text-xl">{student.name}</h1>
                <p className="text-gray-500 text-sm">
                  Lorem ipsum, dolor sit amet consectetur adipisicing elit.
                </p>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 font-medium text-xs">
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{student.bloodType}</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat("en-US").format(student.birthday)}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{student.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="gap-4 grid grid-cols-2 w-full md:w-1/3">
            {/* CARD */}

            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <Image
                  src="/singleAttendance.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <Suspense fallback="Loading...">
                  <StudentAttendanceCard id={id} />
                </Suspense>
              </div>
              <span className="text-gray-400 text-sm">Attendance</span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <Image
                  src="/singleBranch.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />{" "}
                <h1 className="font-semibold text-xl">
                  {student.class?.name.charAt(0)}
                </h1>
              </div>
              <span className="text-gray-400 text-sm">Grade</span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                <Image
                  src="/singleLesson.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <h1 className="font-semibold text-xl">
                  {student.class._count.lessons}
                </h1>
              </div>
              <span className="text-gray-400 text-sm">Lessons</span>
            </div>
            {/* CARD */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-md w-full">
              <div className="flex items-center gap-4">
                {" "}
                <Image
                  src="/singleClass.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <h1 className="font-semibold text-xl">{student.class?.name}</h1>
              </div>
              <span className="text-gray-400 text-sm">Class</span>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="bg-white mt-4 p-4 rounded-md h-[800px]">
          <h1>Student&apos;s Schedule</h1>
          <BigCalendarContainer type="classId" id={student.class.id} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-4 w-full xl:w-1/4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="font-semibold text-xl">Shortcuts</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-gray-500 text-xs">
            <Link
              className="bg-academixSkyLight p-3 rounded-md"
              href={`/list/lessons?classId=${student.class.id}`}
            >
              Student&apos;s Lessons
            </Link>
            <Link
              className="bg-academixPurpleLight p-3 rounded-md"
              href={`/list/teachers?classId=${student.class.id}`}
            >
              Student&apos;s Teachers
            </Link>
            <Link
              className="bg-pink-50 p-3 rounded-md"
              href={`/list/exams?classId=${student.class.id}`}
            >
              Student&apos;s Exams
            </Link>
            <Link
              className="bg-academixSkyLight p-3 rounded-md"
              href={`/list/assignments?classId=${student.class.id}`}
            >
              Student&apos;s Assignments
            </Link>
            <Link
              className="bg-academixYellowLight p-3 rounded-md"
              href={`/list/results?studentId=${id}`}
            >
              Student&apos;s Results
            </Link>
          </div>
        </div>
        <Performance />
        <Announcements />
      </div>
    </div>
  );
};

export default SingleStudentPage;
