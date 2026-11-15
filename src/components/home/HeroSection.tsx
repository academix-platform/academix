"use client";

import Link from "next/link";
import {
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Lock,
  ChevronLeft,
  ChevronRight,
  School,
  FileText,
  FileCheck,
  Zap,
  BookOpen,
  ClipboardList,
  BarChart3,
  UserPlus,
  LogIn,
  Globe,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const t = useTranslations("home.hero");

  return (
    <section
      id="hero"
      className="relative pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-28 overflow-hidden"
    >
      {/* 1. Subtle Ambient Engineering Grid & Violet Glow (Confined to Hero) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(124,58,237,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_25%,#000_65%,transparent_100%)] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(124,58,237,0.10),transparent_75%)] pointer-events-none"
      />

      <div className="z-10 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 md:space-y-7">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brandPurple-200 bg-brandPurple-50/90 text-brandPurple-700 text-xs sm:text-sm font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-brandPurple-600 shrink-0" />
          <span>{t("badge")}</span>
        </div>

        {/* Semantic Headline & Subtitle */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-content-primary leading-[1.18] break-words">
            {t("title").includes(t("highlight")) ? (
              <>
                {t("title").split(t("highlight"))[0]}
                <span className="text-brandPurple-600">{t("highlight")}</span>
                {t("title").split(t("highlight"))[1]}
              </>
            ) : (
              t("title")
            )}
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-content-secondary leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Primary & Secondary Calls to Action */}
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/school-signup">
              <Button
                variant="primary"
                size="lg"
                className="font-semibold shadow-md rounded-xl whitespace-nowrap"
                leftIcon={<UserPlus className="w-4 h-4 shrink-0" />}
              >
                {t("signUp")}
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="secondary"
                size="lg"
                className="font-semibold rounded-xl bg-white hover:bg-slate-50 border border-outline whitespace-nowrap"
                leftIcon={<LogIn className="w-4 h-4 rtl:rotate-180 shrink-0" />}
              >
                {t("signIn")}
              </Button>
            </Link>
          </div>

          {/* Trust Row: 3 Authentic Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-content-secondary pt-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brandPurple-600 shrink-0" />
              <span>{t("trustItem1")}</span>
            </span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-strong" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{t("trustItem2")}</span>
            </span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-strong" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t("trustItem3")}</span>
            </span>
          </div>
        </div>

        {/* Focused Product Preview Container (Exact Blueprint from Screenshot) */}
        <div className="relative mx-auto mt-10 md:mt-14 max-w-5xl rounded-2xl md:rounded-3xl border border-outline/80 bg-white p-4 sm:p-6 md:p-8 shadow-2xl text-start ring-1 ring-black/5">
          {/* Top Browser Window Bar */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-outline">
            {/* Window Controls & Chevrons */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="hidden min-[480px]:flex items-center gap-0.5 text-content-muted">
                <ChevronLeft className="w-4 h-4" />
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Centered Mock URL Bar */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-canvas-subtle border border-outline text-xs text-content-muted font-mono max-w-sm truncate shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-content-muted shrink-0" aria-hidden="true" />
              <span className="truncate">{t("preview.mockUrl")}</span>
              <span className="text-content-muted/60">•</span>
              <span className="text-content-secondary font-sans font-medium text-[11px] truncate">
                {t("preview.browserTitle")}
              </span>
            </div>

            {/* School Identity Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas-subtle border border-outline text-xs font-semibold text-content-primary shrink-0">
              <School className="w-3.5 h-3.5 text-brandPurple-600" />
              <span>{t("preview.schoolName")}</span>
            </div>
          </div>

          {/* 3 Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {/* Metric 1: Total Students */}
            <div className="p-4 rounded-2xl bg-canvas-subtle/80 border border-outline space-y-2">
              <div className="flex items-center justify-between text-content-secondary text-xs font-medium">
                <span>{t("preview.metricStudents")}</span>
                <div className="w-9 h-9 rounded-xl bg-brandPurple-100/80 text-brandPurple-700 flex items-center justify-center shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-content-primary tabular-nums">
                {t("preview.metricStudentsValue")}
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <span className="tabular-nums">{t("preview.metricStudentsNote")}</span>
              </div>
            </div>

            {/* Metric 2: Attendance Rate */}
            <div className="p-4 rounded-2xl bg-canvas-subtle/80 border border-outline space-y-2">
              <div className="flex items-center justify-between text-content-secondary text-xs font-medium">
                <span>{t("preview.metricAttendance")}</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-content-primary tabular-nums">
                {t("preview.metricAttendanceValue")}
              </p>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <span className="tabular-nums">{t("preview.metricAttendanceNote")}</span>
              </div>
            </div>

            {/* Metric 3: Academic Term */}
            <div className="p-4 rounded-2xl bg-canvas-subtle/80 border border-outline space-y-2">
              <div className="flex items-center justify-between text-content-secondary text-xs font-medium">
                <span>{t("preview.metricTerm")}</span>
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-content-primary">
                {t("preview.metricTermValue")}
              </p>
              <p className="text-xs text-content-muted font-medium">
                {t("preview.metricTermNote")}
              </p>
            </div>
          </div>

          {/* Bottom Split Area (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
            {/* Left Column (in RTL): Live Academic Activity */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-canvas-subtle/80 border border-outline space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-content-primary pb-1">
                  <span className="w-2 h-2 rounded-full bg-brandPurple-600 animate-pulse" />
                  <span>{t("preview.activityTitle")}</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Activity 1 */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-outline/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-brandPurple-50 text-brandPurple-600 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-content-primary truncate">
                          {t("preview.activityItem1Title")}
                        </p>
                        <p className="text-[11px] text-content-muted">
                          {t("preview.activityItem1Detail")}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brandPurple-50 text-brandPurple-700 border border-brandPurple-200 shrink-0">
                      {t("preview.activityItem1Status")}
                    </span>
                  </div>

                  {/* Activity 2 */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-outline/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-content-primary truncate">
                          {t("preview.activityItem2Title")}
                        </p>
                        <p className="text-[11px] text-content-muted">
                          {t("preview.activityItem2Detail")}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {t("preview.activityItem2Status")}
                    </span>
                  </div>

                  {/* Activity 3 */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-outline/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-content-primary truncate">
                          {t("preview.activityItem3Title")}
                        </p>
                        <p className="text-[11px] text-content-muted">
                          {t("preview.activityItem3Detail")}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {t("preview.activityItem3Status")}
                    </span>
                  </div>
                </div>
              </div>

              {/* View All Link */}
              <div className="pt-2 border-t border-outline/60 flex justify-start">
                <span className="text-xs font-semibold text-brandPurple-700 hover:text-brandPurple-800 flex items-center gap-1 cursor-pointer">
                  <span>{t("preview.viewAllActivity")}</span>
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                </span>
              </div>
            </div>

            {/* Right Column (in RTL): Quick Shortcuts 2x3 Grid */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-canvas-subtle/80 border border-outline space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-content-primary pb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{t("preview.shortcutsTitle")}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Student Management */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-brandPurple-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brandPurple-50 text-brandPurple-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutStudents")}
                  </span>
                </div>

                {/* 2. Schedules */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutSchedules")}
                  </span>
                </div>

                {/* 3. Mark Attendance */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-amber-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutAttendance")}
                  </span>
                </div>

                {/* 4. Exams */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-blue-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutExams")}
                  </span>
                </div>

                {/* 5. Reports */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-brandPurple-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brandPurple-50 text-brandPurple-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutReports")}
                  </span>
                </div>

                {/* 6. Learning Materials */}
                <div className="p-3 rounded-xl bg-white border border-outline/70 flex flex-col items-center justify-center text-center gap-2 shadow-2xs hover:border-teal-300 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-content-primary text-[11px]">
                    {t("preview.shortcutMaterials")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
