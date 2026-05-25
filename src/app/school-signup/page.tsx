"use client";

import SchoolSignupForm from "@/components/SchoolSignupForm";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function SchoolSignupPage() {
  const router = useRouter();

  return (
    <div className="relative flex justify-center items-center bg-academixPurpleDark/90 p-3 md:p-5 min-h-screen overflow-hidden">
      <div className="-top-24 -left-20 absolute bg-academixSky/40 blur-3xl rounded-full w-72 h-72" />
      <div className="-right-24 -bottom-16 absolute bg-academixPurple/40 blur-3xl rounded-full w-80 h-80" />

      <div className="z-10 relative gap-0 grid grid-cols-1 lg:grid-cols-2 bg-white shadow-xl mx-auto rounded-3xl w-full max-w-5xl lg:h-[90dvh] overflow-hidden">
        <div className="relative flex flex-col bg-gradient-to-br from-academixPurpleDark via-violet-600 to-fuchsia-600 p-7 md:p-8 text-white">
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 mb-4 text-white/80 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="/logo-white.png"
                alt="Academix logo"
                className="w-[50px] h-[40px] rotate-[-15deg]"
                width={50}
                height={40}
              />

              <span className="font-bold text-xl tracking-wide">ACADEMIX</span>
            </div>
            <h1 className="mt-8 font-bold text-white text-3xl leading-tight">
              School{" "}
              <span className="bg-clip-text bg-gradient-to-r from-fuchsia-600 to-violet-300 text-transparent leading-tight">
                {" "}
                Signup
              </span>
            </h1>
            <p className="mt-4 text-white/85 text-sm leading-6">
              Register your school details and create your primary admin
              account. After review, the school will be activated by Academix.
            </p>
          </div>

          <div className="space-y-3 mt-6 text-sm">
            <p className="bg-white/10 px-4 py-3 rounded-xl">
              1. Submit complete school profile
            </p>
            <p className="bg-white/10 px-4 py-3 rounded-xl">
              2. Verification by Academix
            </p>
            <p className="bg-white/10 px-4 py-3 rounded-xl">
              3. Access granted to dashboard
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 h-full">
          <SchoolSignupForm />
        </div>
      </div>
    </div>
  );
}
