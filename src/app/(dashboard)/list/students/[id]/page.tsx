import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import Performance from "@/components/Performance";
import Image from "next/image";
import Link from "next/link";

const SingleStudentPage = () => {
  return (
    <div className="flex xl:flex-row flex-col flex-1 gap-4 p-4">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex lg:flex-row flex-col gap-4">
          {/* USER INFO CARD */}
          <div className="flex flex-1 gap-4 bg-lamaSky px-4 py-6 rounded-md">
            <div className="w-1/3">
              <Image
                src="https://images.pexels.com/photos/5414817/pexels-photo-5414817.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt=""
                width={144}
                height={144}
                className="rounded-full w-36 h-36 object-cover"
              />
            </div>
            <div className="flex flex-col justify-between gap-4 w-2/3">
              <h1 className="font-semibold text-xl">Cameron Moran</h1>
              <p className="text-gray-500 text-sm">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit.
              </p>
              <div className="flex flex-wrap justify-between items-center gap-2 font-medium text-xs">
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>A+</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>January 2025</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>user@gmail.com</span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-1/3 lg:w-full 2xl:w-1/3">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>+1 234 567</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex flex-wrap flex-1 justify-between gap-4">
            {/* CARD */}
            <div className="flex gap-4 bg-white p-4 rounded-md w-full md:w-[48%] 2xl:w-[48%] xl:w-[45%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="font-semibold text-xl">90%</h1>
                <span className="text-gray-400 text-sm">Attendance</span>
              </div>
            </div>
            {/* CARD */}
            <div className="flex gap-4 bg-white p-4 rounded-md w-full md:w-[48%] 2xl:w-[48%] xl:w-[45%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="font-semibold text-xl">6th</h1>
                <span className="text-gray-400 text-sm">Grade</span>
              </div>
            </div>
            {/* CARD */}
            <div className="flex gap-4 bg-white p-4 rounded-md w-full md:w-[48%] 2xl:w-[48%] xl:w-[45%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="font-semibold text-xl">18</h1>
                <span className="text-gray-400 text-sm">Lessons</span>
              </div>
            </div>
            {/* CARD */}
            <div className="flex gap-4 bg-white p-4 rounded-md w-full md:w-[48%] 2xl:w-[48%] xl:w-[45%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="font-semibold text-xl">6A</h1>
                <span className="text-gray-400 text-sm">Class</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="bg-white mt-4 p-4 rounded-md h-[800px]">
          <h1>Student&apos;s Schedule</h1>
          <BigCalendar />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-4 w-full xl:w-1/3">
        <div className="bg-white p-4 rounded-md">
          <h1 className="font-semibold text-xl">Shortcuts</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-gray-500 text-xs">
            <Link
              className="bg-lamaSkyLight p-3 rounded-md"
              href={`/list/lessons?classId=${2}`}
            >
              Student&apos;s Lessons
            </Link>
            <Link
              className="bg-lamaPurpleLight p-3 rounded-md"
              href={`/list/teachers?classId=${2}`}
            >
              Student&apos;s Teachers
            </Link>
            <Link
              className="bg-pink-50 p-3 rounded-md"
              href={`/list/exams?classId=${2}`}
            >
              Student&apos;s Exams
            </Link>
            <Link
              className="bg-lamaSkyLight p-3 rounded-md"
              href={`/list/assignments?classId=${2}`}
            >
              Student&apos;s Assignments
            </Link>
            <Link
              className="bg-lamaYellowLight p-3 rounded-md"
              href={`/list/results?studentId=${"student2"}`}
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
