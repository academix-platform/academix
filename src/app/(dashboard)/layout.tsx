import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";
import { LoadingProvider } from "@/components/LoadingProvider";

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
    <LoadingProvider>
      <div className="flex h-screen overflow-hidden">
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
            />
            <span className="hidden lg:block font-bold">ACADEMIX</span>
          </Link>
          <Menu authUser={authUser} />
        </div>

        {/* RIGHT */}
        <div className="flex flex-col bg-[#F7F8FA] w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%]">
          <Navbar authUser={authUser} schoolName={schoolName} />
          <div className="overflow-auto">{children}</div>
        </div>
      </div>
    </LoadingProvider>
  );
}
