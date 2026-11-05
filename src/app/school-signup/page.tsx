"use client";

import SchoolSignupForm from "@/components/SchoolSignupForm";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SchoolSignupPage() {
  const router = useRouter();
  const commonT = useTranslations("common");
  const t = useTranslations("schoolSignup.page");

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-canvas p-4 sm:p-6 md:p-8 overflow-x-hidden text-content-primary">
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

      {/* Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between py-2 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface/90 hover:bg-surface border border-outline text-content-secondary hover:text-content-primary text-xs sm:text-sm font-medium shadow-2xs backdrop-blur-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t("goBack")}</span>
        </button>
        <LanguageSwitcher variant="compact" />
      </header>

      {/* Main 2-Column Registration Card */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 shadow-xl rounded-2xl md:rounded-3xl overflow-hidden border border-outline/90 bg-surface/95 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-brandPurple-500/0 before:via-brandPurple-500/50 before:to-brandPurple-500/0">
        {/* Left Column: Platform Branding & Trust Highlights */}
        <aside className="lg:col-span-5 relative flex flex-col justify-between bg-gradient-to-br from-brandPurple-950 via-[#2c1363] to-brandPurple-900 p-8 sm:p-10 text-white overflow-hidden">
          {/* Ambient Internal Mesh Glows */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -end-24 w-80 h-80 bg-[radial-gradient(circle,rgba(168,85,247,0.22),transparent_70%)] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -start-24 w-80 h-80 bg-[radial-gradient(circle,rgba(124,58,237,0.20),transparent_70%)] pointer-events-none"
          />

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/logo-white.png"
                alt="Academix logo"
                className="w-9 h-7 object-contain rotate-[-12deg]"
                width={36}
                height={28}
              />
              <span className="font-bold text-xl tracking-wide text-white">
                {commonT("brand")}
              </span>
            </Link>

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-brandPurple-300" />
                <span>{t("badge")}</span>
              </span>

              <h1 className="mt-4 font-bold text-3xl sm:text-4xl text-white leading-tight">
                {t("titleStart")}{" "}
                <span className="text-brandPurple-300">
                  {t("titleHighlight")}
                </span>
              </h1>
              <p className="mt-3 text-purple-100/90 text-sm leading-relaxed">
                {t("description")}
              </p>
            </div>

            {/* Stepper overview */}
            <div className="space-y-3 mt-8">
              <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-3 rounded-xl transition-colors shadow-2xs">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-brandPurple-950 text-xs font-bold flex items-center justify-center shadow-xs">
                  1
                </span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {t("steps.profile")}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-3 rounded-xl transition-colors shadow-2xs">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-brandPurple-950 text-xs font-bold flex items-center justify-center shadow-xs">
                  2
                </span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {t("steps.verification")}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-3 rounded-xl transition-colors shadow-2xs">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-brandPurple-950 text-xs font-bold flex items-center justify-center shadow-xs">
                  3
                </span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {t("steps.access")}
                </span>
              </div>
            </div>
          </div>

          {/* Trust badges footer */}
          <div className="relative z-10 pt-8 mt-8 border-t border-white/15 flex items-center gap-4 text-xs text-purple-200">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brandPurple-300" />
              <span>{t("trustTenant")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t("trustBilingual")}</span>
            </div>
          </div>
        </aside>

        {/* Right Column: Interactive Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-surface">
          <SchoolSignupForm />
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="relative z-10 text-center py-4 text-xs text-content-muted">
        <span>{commonT("copyright")}</span>
      </footer>
    </div>
  );
}
