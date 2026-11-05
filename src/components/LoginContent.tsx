"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getRoleHome, type UserRole } from "@/lib/utils";
import { ArrowLeft, Eye, EyeOff, Lock, User as UserIcon, Sparkles, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

const LoginContent = () => {
  const commonT = useTranslations("common");
  const t = useTranslations("auth.login");
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

  if (!isUserLoaded) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-canvas p-4 text-content-primary">
        <div className="p-8 rounded-2xl bg-surface border border-outline shadow-xl flex items-center gap-3">
          <span
            className="border-2 border-brandPurple-600/30 border-t-brandPurple-600 rounded-full w-5 h-5 animate-spin"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-content-secondary">
            {t("loadingAuth")}
          </span>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative flex justify-center items-center bg-canvas p-4 min-h-screen overflow-hidden">
        <div className="z-10 relative shadow-xl px-10 py-9 border border-outline bg-surface rounded-2xl md:rounded-3xl w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2.5 mb-5 font-bold text-content-primary text-xl">
            <Image
              src="/logo-purple.png"
              alt="Academix logo"
              className="w-9 h-7 object-contain rotate-[-12deg]"
              width={36}
              height={28}
            />
            <span>{commonT("brand")}</span>
          </div>
          <div className="flex items-center justify-center gap-3 bg-brandPurple-50 border border-brandPurple-200 px-4 py-3 rounded-xl">
            <span
              className="border-2 border-brandPurple-600/30 border-t-brandPurple-600 rounded-full w-5 h-5 animate-spin"
              aria-hidden="true"
            />
            <div className="text-start">
              <p className="font-semibold text-sm text-content-primary">{t("welcomeBack")}</p>
              <p className="text-xs text-content-muted">{t("redirecting")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-canvas p-4 sm:p-6 md:p-8 overflow-hidden text-content-primary">
      {/* 1. Subtle Ambient Engineering Grid (Matching Hero) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(124,58,237,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none"
      />

      {/* 2. Soft Ambient Radial Violet Glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.10),transparent_75%)] pointer-events-none"
      />

      {/* Top Bar with Back Link and LanguageSwitcher */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface/90 hover:bg-surface border border-outline text-content-secondary hover:text-content-primary text-xs sm:text-sm font-medium shadow-2xs backdrop-blur-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t("goHome")}</span>
        </Link>
        <LanguageSwitcher variant="compact" />
      </header>

      {/* Main Login Card */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-md bg-surface/95 backdrop-blur-md border border-outline/90 shadow-xl rounded-2xl md:rounded-3xl p-8 sm:p-10 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-brandPurple-500/0 before:via-brandPurple-500/50 before:to-brandPurple-500/0">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-3">
            <Image
              src="/logo-purple.png"
              alt="Academix logo"
              className="w-10 h-8 object-contain rotate-[-12deg]"
              width={40}
              height={32}
            />
            <span className="font-bold text-2xl tracking-tight text-content-primary">
              {commonT("brand")}
            </span>
          </Link>
          <h1 className="font-bold text-xl text-content-primary tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            {t("subtitle")}
          </p>
        </div>

        <form className="flex flex-col gap-4.5" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-content-primary text-xs font-semibold uppercase tracking-wider"
              htmlFor="identifier"
            >
              {t("identifier")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-content-muted">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full h-11 ps-10 pe-4 rounded-xl bg-surface border border-outline text-content-primary placeholder:text-content-muted text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                placeholder={t("identifier")}
                required
                autoComplete="username"
              />
            </div>
            {errors?.fields?.identifier && (
              <p role="alert" className="text-red-500 text-xs font-medium">
                {errors.fields.identifier.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-content-primary text-xs font-semibold uppercase tracking-wider"
              htmlFor="password"
            >
              {t("password")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-content-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 ps-10 pe-11 rounded-xl bg-surface border border-outline text-content-primary placeholder:text-content-muted text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                placeholder={t("password")}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="end-3 absolute inset-y-0 my-auto h-7 w-7 flex items-center justify-center text-content-muted hover:text-content-primary rounded-md transition-colors"
                aria-label={
                  showPassword ? t("hidePassword") : t("showPassword")
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors?.fields?.password && (
              <p role="alert" className="text-red-500 text-xs font-medium">
                {errors.fields.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={fetchStatus === "fetching"}
            variant="primary"
            size="lg"
            className="w-full mt-2 font-semibold shadow-xs"
          >
            {fetchStatus === "fetching" ? (
              <>
                <span
                  className="border-2 border-white/40 border-t-white rounded-full w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
                <span>{t("signingIn")}</span>
              </>
            ) : (
              <span>{t("signIn")}</span>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-5 border-t border-outline text-center">
          <p className="text-content-secondary text-xs">
            {t("newSchool")}{" "}
            <Link
              href="/school-signup"
              className="text-brandPurple-600 hover:text-brandPurple-700 hover:underline font-semibold transition-colors"
            >
              {t("signupRequest")}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="relative z-10 text-center py-2 text-xs text-content-muted">
        <span>{commonT("copyright")}</span>
      </footer>
    </div>
  );
};

export default LoginContent;
