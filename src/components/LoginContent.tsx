"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getRoleHome, type UserRole } from "@/lib/utils";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

const LoginContent = () => {
  const { isLoaded: isUserLoaded, user } = useUser();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isUserLoaded || !user) return;

    const redirectUrl = searchParams.get("redirect_url");
    const role = user.publicMetadata.role as UserRole | undefined;
    const shouldUsePostLogin =
      role === "admin" ||
      role === "teacher" ||
      role === "student" ||
      role === "parent";
    const destination =
      redirectUrl ||
      (shouldUsePostLogin
        ? "/post-login"
        : role
          ? getRoleHome(role)
          : "/post-login");

    if (window.location.pathname === destination) return;

    router.replace(destination);
  }, [isUserLoaded, user, router, searchParams]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await signIn.password({ identifier, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize();
      return;
    }
  };

  if (!isUserLoaded) return null;

  if (user) {
    return (
      <div className="relative flex justify-center items-center bg-gradient-to-br from-academixPurpleDark via-violet-600 to-fuchsia-600 p-4 h-screen overflow-hidden">
        <div className="-top-24 -left-24 absolute bg-academixPurple/35 blur-3xl rounded-full w-72 h-72" />
        <div className="-right-16 -bottom-20 absolute bg-white/20 blur-3xl rounded-full w-80 h-80" />
        <div className="z-10 relative shadow-2xl backdrop-blur-sm px-10 py-9 border border-white/60 rounded-2xl w-[380px] text-gray-600">
          <h1 className="flex items-center gap-2 mb-4 font-bold text-white text-xl">
            <Image
              src="/logo-white.png"
              alt="Academix logo"
              className="w-[44px] h-[34px] rotate-[-15deg]"
              width={40}
              height={40}
            />
            ACADEMIX
          </h1>
          <div className="flex items-center gap-3 bg-academixPurpleLight/40 px-4 py-3 rounded-xl">
            <span
              className="border-2 border-academixPurple/30 border-t-white rounded-full w-5 h-5 animate-spin"
              aria-hidden="true"
            />
            <div className="text-white">
              <p className="font-medium text-sm">Welcome back</p>
              <p className="text-xs">Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex justify-center items-center bg-gradient-to-br from-academixPurpleDark via-violet-600 to-fuchsia-600 p-4 h-screen overflow-hidden">
      <div className="-top-24 -left-24 absolute bg-academixPurple/35 blur-3xl rounded-full w-72 h-72" />
      <div className="-right-16 -bottom-20 absolute bg-white/20 blur-3xl rounded-full w-80 h-80" />
      <div className="z-10 relative flex flex-col gap-6 shadow-2xl backdrop-blur-sm p-10 md:p-12 border border-white/60 rounded-2xl w-full max-w-[460px]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-4 text-gray-200 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go home
          </Link>
          <div>
            <h1 className="flex items-center gap-2 mb-2 font-bold text-white text-2xl">
              <Image
                src="/logo-white.png"
                alt="Academix logo"
                className="w-[48px] h-[36px] rotate-[-15deg]"
                width={40}
                height={40}
              />
              ACADEMIX
            </h1>
            <h2 className="ml-4 text-gray-300">Sign in to your account</h2>
          </div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-white text-xs" htmlFor="identifier">
              Username or Email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-fuchsia-600 rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
              required
              autoComplete="username"
            />
            {errors?.fields?.identifier && (
              <p role="alert" className="text-red-500 text-xs">
                {errors.fields.identifier.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-white text-xs" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:bg-academixPurpleLight px-4 py-3 pr-20 border-2 border-gray-200 focus:border-fuchsia-600 rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="right-2 absolute inset-y-0 text-gray-500 text-xs"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors?.fields?.password && (
              <p role="alert" className="text-red-500 text-xs">
                {errors.fields.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={fetchStatus === "fetching"}
            className="flex justify-center items-center gap-2 bg-gradient-to-br from-fuchsia-600 to-violet-600 disabled:opacity-80 shadow-md mt-2 py-2.5 rounded-md text-white"
          >
            {fetchStatus === "fetching" ? (
              <>
                <span
                  className="border-2 border-white/40 border-t-white rounded-full w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <p className="text-white text-xs">
          New school?{" "}
          <Link href="/school-signup" className="text-gray-300 hover:underline">
            Submit signup request
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginContent;
