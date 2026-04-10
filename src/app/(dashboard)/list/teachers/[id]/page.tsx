import Announcements from "@/components/Announcements";
import BigCalendarLoader from "@/components/BigCalendarLoader";
import FormModal from "@/components/FormModal";
import Performance from "@/components/Performance";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const SingleTeacherPage = () => {
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
                src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt=""
                width={144}
                height={144}
                className="rounded-full w-36 h-36 object-cover"
              />
            </div>
            <div className="flex flex-col justify-between gap-4 w-2/3">
              <div className="flex items-center gap-4">
                <h1 className="font-semibold text-xl">Leonard Snyder</h1>
                {role === "admin" && (
                  <FormModal
                    table="teacher"
                    type="update"
                    data={{
                      id: 1,
                      username: "deanguerrero",
                      email: "deanguerrero@gmail.com",
                      password: "password",
                      firstName: "Dean",
                      lastName: "Guerrero",
                      phone: "+1 234 567 89",
                      address: "1234 Main St, Anytown, USA",
                      bloodType: "A+",
                      dateOfBirth: "2000-01-01",
                      sex: "male",
                      img: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=1200",
                    }}
                  />
                )}
              </div>
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
                <h1 className="font-semibold text-xl">2</h1>
                <span className="text-gray-400 text-sm">Branches</span>
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
                <h1 className="font-semibold text-xl">6</h1>
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
                <h1 className="font-semibold text-xl">6</h1>
                <span className="text-gray-400 text-sm">Classes</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="bg-white mt-4 p-4 rounded-md h-[800px]">
          <h1>Teacher&apos;s Schedule</h1>
          <BigCalendarLoader />
        </div>
      </div>
      {/* RIGHT */}
      <div className="flex flex-col gap-4 w-full xl:w-1/3">
        <div className="bg-white p-4 rounded-md">
          <h1 className="font-semibold text-xl">Shortcuts</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-gray-500 text-xs">
            <Link
              className="bg-lamaSkyLight p-3 rounded-md"
              href={`/list/classes?teacherId=${"teacher2"}`}
            >
              Teacher&apos;s Classes
            </Link>
            <Link
              className="bg-lamaPurpleLight p-3 rounded-md"
              href={`/list/students?teacherId=${"teacher2"}`}
            >
              Teacher&apos;s Students
            </Link>
            <Link
              className="bg-lamaYellowLight p-3 rounded-md"
              href={`/list/lessons?teacherId=${"teacher2"}`}
            >
              Teacher&apos;s Lessons
            </Link>
            <Link
              className="bg-pink-50 p-3 rounded-md"
              href={`/list/exams?teacherId=${"teacher3"}`}
            >
              Teacher&apos;s Exams
            </Link>
            <Link
              className="bg-lamaSkyLight p-3 rounded-md"
              href={`/list/assignments?teacherId=${"teacher3"}`}
            >
              Teacher&apos;s Assignments
            </Link>
          </div>
        </div>
        <Performance />
        <Announcements />
      </div>
    </div>
  );
};

export default SingleTeacherPage;
