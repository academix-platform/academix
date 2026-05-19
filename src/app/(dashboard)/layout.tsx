import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  const schoolName = authUser?.schoolId
    ? await getSchoolName(authUser.schoolId)
    : null;

  return (
    <div className="flex">
      {/* LEFT */}
      <div className="p-4 w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] overflow-auto">
        <Link
          href="/"
          className="flex justify-center lg:justify-start items-center gap-2"
        >
          <Image
            src="/icon.png"
            alt="logo"
            className="w-[32px] h-[32px]"
            width={32}
            height={32}
            style={{ height: "auto" }}
          />
          <span className="hidden lg:block font-bold">ACADEMIX</span>
        </Link>
        <Menu authUser={authUser} />
      </div>

      {/* RIGHT */}
      <div className="flex flex-col bg-[#F7F8FA] w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%]">
        <Navbar authUser={authUser} schoolName={schoolName} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
