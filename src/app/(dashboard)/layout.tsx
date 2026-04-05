import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
        <Menu />
      </div>
      {/* RIGHT */}
      <div className="flex flex-col bg-[#F7F8FA] w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%]">
        <Navbar />
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  );
}
