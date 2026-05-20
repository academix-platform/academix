import Image from "next/image";
import SignOutToSignInButton from "@/components/SignOutToSignInButton";

export default function UnauthorizedPage() {
  return (
    <div className="relative flex justify-center items-center bg-gradient-to-br from-academixPurpleDark via-violet-600 to-fuchsia-600 p-4 min-h-screen overflow-hidden">
      <div className="-top-24 -left-24 absolute bg-academixPurple/35 blur-3xl rounded-full w-72 h-72" />
      <div className="-right-16 -bottom-20 absolute bg-white/20 blur-3xl rounded-full w-80 h-80" />

      <div className="z-10 relative shadow-2xl backdrop-blur-sm p-8 border border-white/60 rounded-2xl w-full max-w-lg text-white">
        <h1 className="flex items-center gap-2 mb-4 font-bold text-xl">
          <Image
            src="/logo-white.png"
            alt="Academix logo"
            className="w-[44px] h-[34px] rotate-[-15deg]"
            width={40}
            height={40}
          />
          ACADEMIX
        </h1>

        <h2 className="mb-3 font-semibold text-2xl">Unauthorized Access</h2>
        <p className="text-sm leading-6">
          You do not have permission to access this page with your current role
          or account status.
        </p>

        <div className="mt-6">
          <SignOutToSignInButton />
        </div>
      </div>
    </div>
  );
}
