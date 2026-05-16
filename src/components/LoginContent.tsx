"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getRoleHome, type UserRole } from "@/lib/utils";

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
    const destination = redirectUrl || (role ? getRoleHome(role) : "/post-login");

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
      <div className="flex justify-center items-center bg-lamaSkyLight h-screen">
        <div className="bg-white shadow-2xl px-10 py-9 rounded-2xl w-[360px] text-gray-600">
          <h1 className="flex items-center gap-2 mb-4 font-bold text-xl">
            <Image src="/icon.png" alt="Academix logo" width={24} height={24} />
            Academix
          </h1>
          <div className="flex items-center gap-3 bg-academixPurpleLight/40 px-4 py-3 rounded-xl">
            <span
              className="border-2 border-academixPurple/30 border-t-academixPurple rounded-full w-5 h-5 animate-spin"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-sm">Welcome back</p>
              <p className="text-gray-500 text-xs">
                Redirecting to your dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center bg-lamaSkyLight h-screen">
      <div className="flex flex-col gap-6 bg-white shadow-2xl p-12 rounded-md">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 font-bold text-xl">
            <Image src="/icon.png" alt="Academix logo" width={24} height={24} />
            Academix
          </h1>
          <h2 className="text-gray-400">Sign in to your account</h2>
        </div>

        <form className="flex flex-col gap-4 min-w-[300px]" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs" htmlFor="identifier">
              Username or Email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="p-2 rounded-md ring-[1.5px] ring-gray-300 text-sm"
              required
              autoComplete="username"
            />
            {/* v7: per-field errors via errors.fields */}
            {errors?.fields?.identifier && (
              <p role="alert" className="text-red-500 text-xs">
                {errors.fields.identifier.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 pr-20 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="right-2 absolute inset-y-0 text-gray-500 text-xs"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
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
            className="flex justify-center items-center gap-2 bg-academixPurpleDark disabled:opacity-60 mt-2 p-2 rounded-md text-white"
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
      </div>
    </div>
  );
};

export default LoginContent;
