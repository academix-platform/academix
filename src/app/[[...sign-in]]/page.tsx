"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata.role;

      if (typeof role === "string" && role.length > 0) {
        router.replace(`/${role}`);
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return null;
  }

  if (user) {
    return (
      <div className="flex justify-center items-center bg-lamaSkyLight h-screen">
        <div className="bg-white shadow-2xl px-12 py-10 rounded-md text-gray-500">
          <h1 className="flex items-center gap-2 mb-2 w-[24px] h-[24px] font-bold text-xl">
            <Image src="/icon.png" alt="" width={24} height={24} />
            Academix
          </h1>
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center bg-lamaSkyLight h-screen">
      <div className="flex flex-col gap-6 bg-white shadow-2xl p-12 rounded-md">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 w-[24px] h-[24px] font-bold text-xl">
            <Image src="/icon.png" alt="" width={24} height={24} />
            Academix
          </h1>
          <h2 className="text-gray-400">Sign in to your account</h2>
        </div>
        <SignIn />
      </div>
    </div>
  );
};

export default LoginPage;
