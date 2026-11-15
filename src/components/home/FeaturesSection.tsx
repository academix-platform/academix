"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Users,
  FileDown,
  FileText,
  Bell,
  Clock,
  TrendingUp,
  Search,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Download,
  Cloud,
} from "lucide-react";
import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";

const FeaturesSection = () => {
  const t = useTranslations("home.features");

  return (
    <RevealSection>
      <section
        id="features"
        className="relative bg-canvas-subtle/50 border-y border-outline py-20 md:py-28"
      >
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Section Header */}
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full bg-brandPurple-50 border border-brandPurple-200 text-brandPurple-800 text-xs font-semibold tracking-wider uppercase shadow-2xs">
              {t("badge")}
            </span>
            <h2 className="text-display font-extrabold tracking-tight text-content-primary leading-[1.2]">
              {t("title")}
            </h2>
            <p className="text-content-secondary text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* High-Density Neo-Bento Grid: 2 Flagship + 3 Supporting + 1 Wide Hub */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 mt-14">
            {/* 1. FLAGSHIP FEATURE 1: Student Operations & Directory (Spans 7 cols) */}
            <article className="lg:col-span-7 group relative bg-surface p-6 sm:p-8 border border-outline hover:border-brandPurple-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-start overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-brandPurple-500/0 before:via-brandPurple-500/40 before:to-brandPurple-500/0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex justify-center items-center bg-brandPurple-50 border border-brandPurple-200/80 rounded-xl w-12 h-12 text-brandPurple-600 shadow-2xs group-hover:bg-brandPurple-600 group-hover:text-white transition-colors duration-200">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t("studentSyncBadge")}
                    </span>
                    <span className="text-[11px] font-semibold text-brandPurple-700 bg-brandPurple-50 border border-brandPurple-200/80 px-2.5 py-0.5 rounded-full">
                      {t("items.students.title")}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xl text-content-primary tracking-tight">
                    {t("items.students.title")}
                  </h3>
                  <p className="mt-2 text-content-secondary text-sm leading-relaxed max-w-xl">
                    {t("items.students.description")}
                  </p>
                </div>

                {/* Embedded Illustrative Student Cockpit */}
                <div className="pt-2 space-y-3">
                  {/* Search Bar Simulation */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-canvas-subtle border border-outline/70 text-xs">
                    <div className="flex items-center gap-2 text-content-muted">
                      <Search className="w-3.5 h-3.5" />
                      <span>{t("studentSearchPlaceholder")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface border border-outline text-[10px] text-content-muted font-mono">
                        ⌘K
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-brandPurple-100/60 text-brandPurple-800 text-[11px] font-semibold">
                        {t("studentActiveBadge")}
                      </span>
                    </div>
                  </div>

                  {/* Student Directory Cards */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline/80 shadow-2xs hover:border-brandPurple-300 transition-colors text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brandPurple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                          {t("studentPreview1Name").slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-content-primary">{t("studentPreview1Name")}</p>
                            <span className="text-[10px] font-mono text-content-muted">{t("studentPreview1Id")}</span>
                          </div>
                          <p className="text-[11px] text-content-muted">{t("studentPreview1Class")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-canvas-subtle border border-outline text-[11px] text-content-secondary font-medium">
                          {t("studentPreview1Gpa")}
                        </span>
                        <span className="text-emerald-700 font-medium tabular-nums bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t("studentPreview1Rate")}
                        </span>
                        <span className="text-brandPurple-600 hover:text-brandPurple-800 p-1 rounded-md hover:bg-brandPurple-50 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline/80 shadow-2xs hover:border-brandPurple-300 transition-colors text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                          {t("studentPreview2Name").slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-content-primary">{t("studentPreview2Name")}</p>
                            <span className="text-[10px] font-mono text-content-muted">{t("studentPreview2Id")}</span>
                          </div>
                          <p className="text-[11px] text-content-muted">{t("studentPreview2Class")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-canvas-subtle border border-outline text-[11px] text-content-secondary font-medium">
                          {t("studentPreview2Gpa")}
                        </span>
                        <span className="text-emerald-700 font-medium tabular-nums bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t("studentPreview2Rate")}
                        </span>
                        <span className="text-brandPurple-600 hover:text-brandPurple-800 p-1 rounded-md hover:bg-brandPurple-50 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Feature Tags */}
              <div className="pt-4 mt-4 border-t border-outline flex flex-wrap items-center gap-2 text-xs text-content-muted">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("studentTag1")}</span>
                </span>
                <span className="text-outline">•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("studentTag2")}</span>
                </span>
                <span className="text-outline">•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("studentTag3")}</span>
                </span>
              </div>
            </article>

            {/* 2. FLAGSHIP FEATURE 2: Assessments & Grading Engine (Spans 5 cols) */}
            <article className="lg:col-span-5 group relative bg-surface p-6 sm:p-8 border border-outline hover:border-amber-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-start overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-amber-500/0 before:via-amber-500/40 before:to-amber-500/0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex justify-center items-center bg-amber-50 border border-amber-200/80 rounded-xl w-12 h-12 text-amber-600 shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors duration-200">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    {t("assessmentBadge")}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xl text-content-primary tracking-tight">
                    {t("items.assessments.title")}
                  </h3>
                  <p className="mt-2 text-content-secondary text-sm leading-relaxed">
                    {t("items.assessments.description")}
                  </p>
                </div>

                {/* Embedded Live Assessment Cockpit */}
                <div className="p-4 rounded-xl bg-canvas-subtle border border-outline/70 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-content-primary text-sm block">
                        {t("assessmentPreviewTitle")}
                      </span>
                      <span className="text-[11px] text-content-muted">
                        {t("assessmentSubjectTag")}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t("assessmentPreviewStatus")}
                    </span>
                  </div>

                  {/* Submission Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-content-muted">{t("assessmentPreviewRatio")}</span>
                      <span className="font-semibold text-emerald-700">{t("assessmentTrend")}</span>
                    </div>
                    <div className="w-full bg-outline/60 h-2 rounded-full overflow-hidden">
                      <div className="bg-brandPurple-600 h-full rounded-full transition-all duration-500" style={{ width: "94%" }} />
                    </div>
                  </div>

                  {/* Rubric Breakdown Chips */}
                  <div className="pt-2 border-t border-outline/60 space-y-1.5 text-[11px] text-content-secondary">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brandPurple-600" />
                        <span>{t("assessmentRubric1")}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t("assessmentRubric2")}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Footer */}
              <div className="pt-4 mt-4 border-t border-outline flex items-center gap-2 text-xs text-content-muted">
                <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{t("assessmentNotification")}</span>
              </div>
            </article>

            {/* 3. SUPPORTING FEATURE 1: Attendance Tracking (Spans 4 cols) */}
            <article className="lg:col-span-4 group relative bg-surface p-6 sm:p-7 border border-outline hover:border-emerald-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex justify-center items-center bg-emerald-50 border border-emerald-200/80 rounded-xl w-11 h-11 text-emerald-600 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("attendanceLiveBadge")}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-content-primary tracking-tight">
                    {t("items.attendance.title")}
                  </h3>
                  <p className="mt-1 text-content-secondary text-sm leading-relaxed">
                    {t("items.attendance.description")}
                  </p>
                </div>

                {/* Live Attendance Meter Box */}
                <div className="p-3.5 rounded-xl bg-canvas-subtle border border-outline/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-content-muted">{t("attendanceRateNote")}</span>
                    <span className="font-bold text-2xl text-emerald-700 tabular-nums">
                      {t("attendanceRate")}
                    </span>
                  </div>

                  {/* Multi-segment Bar */}
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-emerald-500 h-full rounded-s-full" style={{ width: "96.8%" }} />
                    <div className="bg-blue-500 h-full" style={{ width: "2.4%" }} />
                    <div className="bg-amber-400 h-full rounded-e-full" style={{ width: "0.8%" }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-content-muted pt-0.5">
                    <span>{t("attendancePresent")}</span>
                    <span>{t("attendanceExcused")}</span>
                    <span>{t("attendanceUnexcused")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline flex items-center justify-between text-xs text-content-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t("attendanceClassesSummary")}</span>
                </span>
              </div>
            </article>

            {/* 4. SUPPORTING FEATURE 2: Course & Timetable Management (Spans 4 cols) */}
            <article className="lg:col-span-4 group relative bg-surface p-6 sm:p-7 border border-outline hover:border-blue-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex justify-center items-center bg-blue-50 border border-blue-200/80 rounded-xl w-11 h-11 text-blue-600 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
                    {t("courseScheduleBadge")}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-content-primary tracking-tight">
                    {t("items.courses.title")}
                  </h3>
                  <p className="mt-1 text-content-secondary text-sm leading-relaxed">
                    {t("items.courses.description")}
                  </p>
                </div>

                {/* Active Timetable Mini-Calendar */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-canvas-subtle border border-outline/70 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{t("courseTime1")}</span>
                      </div>
                      <p className="font-semibold text-content-primary">{t("coursePreview1Title")}</p>
                      <p className="text-[10px] text-content-muted">{t("coursePreview1Teacher")}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                      {t("courseRoom1")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-canvas-subtle border border-outline/70 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{t("courseTime2")}</span>
                      </div>
                      <p className="font-semibold text-content-primary">{t("coursePreview2Title")}</p>
                      <p className="text-[10px] text-content-muted">{t("coursePreview2Teacher")}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                      {t("courseRoom2")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline flex items-center justify-between text-xs text-content-muted">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t("courseFeatureTag")}</span>
                </span>
              </div>
            </article>

            {/* 5. SUPPORTING FEATURE 3: Grades & Advanced Reports (Spans 4 cols) */}
            <article className="lg:col-span-4 group relative bg-surface p-6 sm:p-7 border border-outline hover:border-brandPurple-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex justify-center items-center bg-brandPurple-50 border border-brandPurple-200/80 rounded-xl w-11 h-11 text-brandPurple-600 shadow-2xs group-hover:bg-brandPurple-600 group-hover:text-white transition-colors duration-200">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-brandPurple-700 bg-brandPurple-50 border border-brandPurple-200/80 px-2 py-0.5 rounded-full">
                    {t("reportsPreviewStatus")}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-content-primary tracking-tight">
                    {t("items.reports.title")}
                  </h3>
                  <p className="mt-1 text-content-secondary text-sm leading-relaxed">
                    {t("items.reports.description")}
                  </p>
                </div>

                {/* Grade Distribution & Performance Box */}
                <div className="p-3.5 rounded-xl bg-canvas-subtle border border-outline/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-content-muted">{t("reportsPreviewTerm")}</span>
                    <span className="font-bold text-brandPurple-700 tabular-nums">
                      {t("reportsPreviewGpa")}
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-emerald-500 h-full rounded-s-full" style={{ width: "44%" }} />
                    <div className="bg-blue-500 h-full" style={{ width: "38%" }} />
                    <div className="bg-amber-400 h-full rounded-e-full" style={{ width: "18%" }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-content-muted pt-0.5">
                    <span>{t("reportsPreviewTierA")}</span>
                    <span>{t("reportsPreviewTierB")}</span>
                    <span>{t("reportsTierC")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline flex items-center justify-between text-xs text-content-muted">
                <span className="flex items-center gap-1.5 font-medium text-brandPurple-700">
                  <FileDown className="w-3.5 h-3.5 text-brandPurple-600" />
                  <span>{t("reportsDownloadCta")}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">{t("reportsTrend")}</span>
              </div>
            </article>

            {/* 6. SUPPORTING FEATURE 4: Virtual Learning & Collaborative Hub (Spans 12 cols) */}
            <article className="lg:col-span-12 group relative bg-surface p-6 sm:p-8 border border-outline hover:border-brandPurple-300/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 text-start overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-blue-500/0 before:via-brandPurple-500/40 before:to-blue-500/0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Description Column (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex justify-center items-center bg-blue-50 border border-blue-200/80 rounded-xl w-10 h-10 text-blue-600 shadow-2xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                      {t("learningCloudSync")}
                    </span>
                  </div>

                  <h3 className="font-bold text-xl text-content-primary tracking-tight">
                    {t("items.learning.title")}
                  </h3>
                  <p className="text-content-secondary text-sm leading-relaxed">
                    {t("items.learning.description")}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-content-muted">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("learningTag1")}</span>
                    </span>
                    <span className="text-outline">•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("learningTag2")}</span>
                    </span>
                    <span className="text-outline">•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("learningTag3")}</span>
                    </span>
                  </div>
                </div>

                {/* Right Interactive Resource Shelf (7 cols) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Resource 1: Study Guide File */}
                  <div className="p-3.5 rounded-xl bg-canvas-subtle border border-outline/80 hover:border-blue-300 transition-colors flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-xs text-content-primary truncate">
                        {t("learningPreview1Title")}
                      </p>
                      <p className="text-[11px] text-content-muted truncate">
                        {t("learningPreview1Detail")}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer">
                          <Download className="w-3 h-3" />
                          <span>{t("learningActionDownload")}</span>
                        </span>
                        <span className="text-[10px] text-content-muted font-mono">PDF • 4.2MB</span>
                      </div>
                    </div>
                  </div>

                  {/* Resource 2: Teacher Notice */}
                  <div className="p-3.5 rounded-xl bg-canvas-subtle border border-outline/80 hover:border-amber-300 transition-colors flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-content-primary truncate">
                          {t("learningPreview2Title")}
                        </p>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {t("learningUrgent")}
                        </span>
                      </div>
                      <p className="text-[11px] text-content-muted truncate">
                        {t("learningPreview2Detail")}
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 text-[10px] text-content-muted">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{t("courseScheduleBadge")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default FeaturesSection;