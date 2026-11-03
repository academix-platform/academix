"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Palette,
  Layers,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Shield,
  FileCode,
  ArrowLeft,
  Type,
  Globe,
  Sliders,
  Maximize2,
} from "lucide-react";
import {
  primitives,
  radii,
  shadows,
  spacing,
  breakpoints,
  typography,
} from "@/lib/design-system/tokens";

type TabKey =
  | "overview"
  | "typography"
  | "colors"
  | "surfaces"
  | "spacing"
  | "components"
  | "architecture";

export default function DesignSystemShowcasePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("typography");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Typography Playground State
  const [typoLang, setTypoLang] = useState<"en" | "ar" | "mixed">("en");
  const [selectedEnglishFont, setSelectedEnglishFont] = useState<"inter" | "poppins">("inter");
  const [selectedArabicFont, setSelectedArabicFont] = useState<"cairo" | "ibm">("cairo");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        previewTheme === "dark" ? "dark bg-[#0a0614] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Bar / Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ms-2 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 transition"
              title="Return to application"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
                A
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base leading-none">Academix Design System</h1>
                  <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Phase 2: Bilingual Typography
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Three-Tier Token Architecture & Bilingual Typography Engine
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Preview Toggle */}
            <button
              onClick={() => setPreviewTheme((prev) => (prev === "light" ? "dark" : "light"))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:border-purple-300 dark:hover:border-purple-600 transition shadow-xs"
            >
              {previewTheme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Preview Dark Tokens</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preview Light Tokens</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
          {[
            { id: "overview", label: "Visual Direction", icon: Sparkles },
            { id: "typography", label: "Bilingual Typography", icon: Type },
            { id: "colors", label: "Color Palette & Tokens", icon: Palette },
            { id: "surfaces", label: "Surfaces & Elevation", icon: Layers },
            { id: "spacing", label: "Spacing & Breakpoints", icon: LayoutGrid },
            { id: "components", label: "Component Tokens", icon: Shield },
            { id: "architecture", label: "Token Consumption Guide", icon: FileCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
         * TAB: BILINGUAL TYPOGRAPHY (PHASE 2)
         * ========================================================================= */}
        {activeTab === "typography" && (
          <div className="space-y-10">
            {/* Header Hero */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#24104f] via-purple-900 to-purple-800 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-purple-200 border border-white/15">
                  <Globe className="w-3.5 h-3.5 text-purple-300" /> Bilingual Educational Typography
                </span>
                <h2 className="text-3xl font-bold tracking-tight">
                  Engineered for High-Density Data & Symmetrical LTR/RTL Harmony
                </h2>
                <p className="text-purple-200 text-sm leading-relaxed">
                  Academix pairs <strong>Inter</strong> for English and <strong>Cairo</strong> for Arabic (with <strong>IBM Plex Sans Arabic</strong> supported for enterprise data). The system features tailored Arabic line-heights (+18% compensation) to prevent glyph clipping, tabular numeric figures, and zero-flicker offline font stacks.
                </p>
              </div>
            </div>

            {/* Font Decision & Evaluation Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* English Font Evaluation */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                      EN
                    </span>
                    <h3 className="font-bold text-base">English Font Selection</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Winner: Inter
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between font-semibold text-purple-900 dark:text-purple-200">
                      <span>✓ Inter (Selected)</span>
                      <span className="font-mono text-[10px]">Optimal for SaaS</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Tall x-height, compact width, micro-adjusted counters, and tabular figures. Perfect for dense gradebooks, schedule matrices, and small metadata (11px–13px) without horizontal blowout.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 opacity-80">
                    <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span>✕ Poppins (Evaluated)</span>
                      <span className="font-mono text-[10px]">Too Wide for Tables</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Geometric sans with wide circular bowls. Striking for marketing headlines, but causes premature text truncation and excessive width in multi-column tables.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 self-center">Preview font:</span>
                  <button
                    onClick={() => setSelectedEnglishFont("inter")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      selectedEnglishFont === "inter"
                        ? "bg-purple-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Inter (Default)
                  </button>
                  <button
                    onClick={() => setSelectedEnglishFont("poppins")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      selectedEnglishFont === "poppins"
                        ? "bg-purple-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Poppins
                  </button>
                </div>
              </div>

              {/* Arabic Font Evaluation */}
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                      AR
                    </span>
                    <h3 className="font-bold text-base">Arabic Font Selection</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Winner: Cairo
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between font-semibold text-purple-900 dark:text-purple-200">
                      <span>✓ Cairo (Selected Primary)</span>
                      <span className="font-mono text-[10px]">Modern Educational Kufic</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Clean geometric Kufic curves with open counters. High legibility in headings and dashboard badges. Perfectly complements our modern purple brand aesthetic.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span>★ IBM Plex Sans Arabic (Supported Secondary)</span>
                      <span className="font-mono text-[10px]">Engineered Data Naskh</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Hybrid Naskh-Kufic design with strict horizontal baseline stability. Supported in token stack for dense institutional and financial reports.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 self-center">Preview font:</span>
                  <button
                    onClick={() => setSelectedArabicFont("cairo")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      selectedArabicFont === "cairo"
                        ? "bg-purple-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Cairo (Default)
                  </button>
                  <button
                    onClick={() => setSelectedArabicFont("ibm")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      selectedArabicFont === "ibm"
                        ? "bg-purple-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    IBM Plex Sans Arabic
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Language & Mode Controller */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Interactive Preview Controller
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: "en", label: "English (LTR)" },
                  { id: "ar", label: "العربية (RTL)" },
                  { id: "mixed", label: "Mixed / ثنائي اللغة" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTypoLang(mode.id as "en" | "ar" | "mixed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      typoLang === mode.id
                        ? "bg-purple-600 text-white shadow-xs"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Complete Typographic Scale */}
            <div
              className={`p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 ${
                typoLang === "ar" ? "font-arabic" : typoLang === "en" ? "font-sans" : ""
              }`}
              dir={typoLang === "ar" ? "rtl" : "ltr"}
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Complete Typographic Hierarchy Scale</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Responsive clamp sizes, matching line-height tokens, and strict weight bindings.
                  </p>
                </div>
                <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded">
                  Active Mode: {typoLang.toUpperCase()}
                </span>
              </div>

              <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                {/* Display */}
                <div className="pt-4 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Display Heading (clamp 32px–44px / 700)</span>
                    <span>.type-display / font-bold</span>
                  </div>
                  <h1 className="type-display text-slate-900 dark:text-white">
                    {typoLang === "ar"
                      ? "نظام إدارة وتقييم التعليم الأكاديمي الذكي"
                      : typoLang === "mixed"
                      ? "Academix نظام إدارة التعليم الأكاديمي 2.0"
                      : "Empowering Modern Academic Excellence"}
                  </h1>
                </div>

                {/* Title 1 */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Page Title 1 (clamp 24px–32px / 700)</span>
                    <span>.type-title-1 / font-bold</span>
                  </div>
                  <h2 className="type-title-1 text-slate-900 dark:text-white">
                    {typoLang === "ar"
                      ? "لوحة تحكم المعلم وسجل الدرجات والتقييم"
                      : typoLang === "mixed"
                      ? "Gradebook سجل الدرجات — Semester 1"
                      : "Teacher Dashboard & Academic Performance"}
                  </h2>
                </div>

                {/* Title 2 */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Section Title 2 (clamp 20px–24px / 600)</span>
                    <span>.type-title-2 / font-semibold</span>
                  </div>
                  <h3 className="type-title-2 text-slate-900 dark:text-white">
                    {typoLang === "ar"
                      ? "الجدول الأسبوعي والامتحانات القادمة"
                      : typoLang === "mixed"
                      ? "Upcoming Exams اختبارات الفصل الدراسي الأول"
                      : "Weekly Class Schedule & Exam Workflow"}
                  </h3>
                </div>

                {/* Title 3 */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Card Title 3 (18px / 600)</span>
                    <span>.type-title-3 / font-semibold</span>
                  </div>
                  <h4 className="type-title-3 text-slate-900 dark:text-white">
                    {typoLang === "ar"
                      ? "تفاصيل الطالب: أحمد عبدالله — الصف العاشر (أ)"
                      : typoLang === "mixed"
                      ? "Student Details: Sarah Jenkins (الصف 10-A)"
                      : "Student Attendance Record & Behavior Notes"}
                  </h4>
                </div>

                {/* Body */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Standard Body (15px / 400 / LH: 1.5 en / 1.65 ar)</span>
                    <span>.type-body / text-content-primary</span>
                  </div>
                  <p className="type-body text-slate-700 dark:text-slate-300 max-w-4xl">
                    {typoLang === "ar"
                      ? "تم تصميم المنصة لتوفير تجربة تعليمية سلسة وسريعة لكافة الطلاب وأولياء الأمور والمعلمين، مع ضمان الدقة الكاملة في احتساب الدرجات وإعداد التقارير الأكاديمية الشاملة وفق المعايير المعتمدة."
                      : typoLang === "mixed"
                      ? "تم تسجيل الطالب في مادة Mathematics 101 بنجاح، وسيبدأ الاختبار النهائي بتاريخ 15 June 2026 في تمام الساعة 09:00 AM."
                      : "Academix delivers a frictionless educational management experience for administrators, teachers, students, and parents, providing enterprise-grade gradebooks, exam workflow tracking, and automated reporting."}
                  </p>
                </div>

                {/* Body Small */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Small Body / Labels (14px / 400 / LH: 1.5 en / 1.65 ar)</span>
                    <span>.type-body-sm / text-content-secondary</span>
                  </div>
                  <p className="type-body-sm text-slate-500 dark:text-slate-400">
                    {typoLang === "ar"
                      ? "يرجى التحقق من صحة البريد الإلكتروني وكلمة المرور الخاصة بالمستخدم قبل إرسال نموذج الاعتماد."
                      : typoLang === "mixed"
                      ? "Please verify the school email (بريد المدرسة) before submitting."
                      : "Please verify user credentials and assigned grade levels before finalizing permissions."}
                  </p>
                </div>

                {/* Caption & Micro */}
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Caption & Micro (12px & 11px / 500)</span>
                    <span>.type-caption / .type-micro</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="type-caption text-slate-400">
                      {typoLang === "ar"
                        ? "آخر تحديث: منذ 5 دقائق بواسطة المشرف"
                        : "Last synchronized: 5 minutes ago by Admin"}
                    </span>
                    <span className="type-micro px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      {typoLang === "ar" ? "معرّف السجل: #9042" : "Record ID: #9042"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arabic Vertical Line-Height & Ascender/Descender Compensation Demo */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  Arabic Ascender & Descender Preservation
                </span>
                <h3 className="font-bold text-base">Zero-Clipping Line-Height Engine</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Arabic calligraphy includes vertical glyph extensions, hamza, dots (نقاط الحروف), and tashkeel. Standard Latin line-heights (1.2 to 1.3) cause severe clipping in containers. Our typography system enforces a <strong>1.65 line-height token</strong> with optical padding on all Arabic containers:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" dir="rtl">
                <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 font-arabic text-sm space-y-1">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block font-sans">
                    ✕ خطأ: Line-Height ضيق (1.15) يؤدي لتداخل النقاط
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-[1.15] bg-white/60 dark:bg-slate-900 p-2 rounded border border-rose-200 overflow-hidden">
                    يَجِبُ التَّحَقُّقُ مِنْ جَمِيعِ نَتَائِجِ الِاخْتِبَارَاتِ النِّهَائِيَّةِ لِطُلَّابِ
                    الصَّفِّ العَاشِرِ قَبْلَ اعْتِمَادِ الشَّهَادَاتِ الرَّسْمِيَّةِ.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 font-arabic text-sm space-y-1">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block font-sans">
                    ✓ صحيح: Line-Height مريح (1.65) يحافظ على كامل الحروف
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-[1.65] bg-white/60 dark:bg-slate-900 p-2 rounded border border-emerald-200">
                    يَجِبُ التَّحَقُّقُ مِنْ جَمِيعِ نَتَائِجِ الِاخْتِبَارَاتِ النِّهَائِيَّةِ لِطُلَّابِ
                    الصَّفِّ العَاشِرِ قَبْلَ اعْتِمَادِ الشَّهَادَاتِ الرَّسْمِيَّةِ.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabular Numerals & High-Density Table Display */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Tabular Numbers in Data Rosters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Using <code>font-variant-numeric: tabular-nums</code> so all columns, grades, and percentages align vertically.
                  </p>
                </div>
                <span className="text-xs font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded">
                  tabular-nums
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left" dir={typoLang === "ar" ? "rtl" : "ltr"}>
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">{typoLang === "ar" ? "اسم الطالب" : "Student Name"}</th>
                      <th className="p-3">{typoLang === "ar" ? "المعرف" : "ID"}</th>
                      <th className="p-3">{typoLang === "ar" ? "الرياضيات" : "Mathematics"}</th>
                      <th className="p-3">{typoLang === "ar" ? "الفيزياء" : "Physics"}</th>
                      <th className="p-3">{typoLang === "ar" ? "المجموع" : "Total"}</th>
                      <th className="p-3">{typoLang === "ar" ? "النسبة" : "Percentage"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                    {[
                      { nameEn: "Sarah Jenkins", nameAr: "سارة محمود الخالد", id: "10941", m: "98.5", p: "94.0", tot: "192.5", pct: "96.25%" },
                      { nameEn: "Omar Alsultan", nameAr: "عمر فهد السلطان", id: "10942", m: "88.0", p: "91.5", tot: "179.5", pct: "89.75%" },
                      { nameEn: "Hassan Al-Baqir", nameAr: "حسن أحمد الباقر", id: "10943", m: "76.0", p: "82.0", tot: "158.0", pct: "79.00%" },
                      { nameEn: "Laila Noureddine", nameAr: "ليلى نورالدين خليل", id: "10944", m: "99.0", p: "98.0", tot: "197.0", pct: "98.50%" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/30">
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {typoLang === "ar" ? row.nameAr : row.nameEn}
                        </td>
                        <td className="p-3 text-slate-500 font-mono">{row.id}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{row.m}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{row.p}</td>
                        <td className="p-3 font-bold text-purple-700 dark:text-purple-300">{row.tot}</td>
                        <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{row.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contextual Arabic Line-Height: Buttons & Controls Audit */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      Optical Control Alignment
                    </span>
                    <h3 className="font-bold text-base">Category-Scoped Line-Height (Zero Vertical Clipping)</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Applying a blanket 1.65 line-height causes fixed-height controls (<code className="font-mono">h-9</code>, <code className="font-mono">h-10</code>) to clip Arabic dots (<bdi>ي, ق, ت, ن</bdi>). Our architecture scopes line-height contextually.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                {/* Blanket 1.65 Problem Demonstration */}
                <div className="p-4 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-3 font-arabic">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      ✕ مشكلة: تطبيق 1.65 على الأزرار الثابتة (h-9)
                    </span>
                    <span className="text-[11px] font-mono text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded">
                      line-height: 1.65
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="h-9 px-4 rounded-md bg-purple-600 text-white text-sm font-medium flex items-center justify-center overflow-hidden border border-purple-700"
                      style={{ lineHeight: 1.65 }}
                    >
                      تسجيل الحضور اليومي
                    </button>
                    <span
                      className="h-6 px-2.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium inline-flex items-center border border-purple-200 overflow-hidden"
                      style={{ lineHeight: 1.65 }}
                    >
                      مكتمل
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-tight">
                    تتسبب قيمة 1.65 بارتفاع صندوق النص متجاوزاً المساحة الرأسية المتاحة للأزرار، مما يضغط النقاط السفلية (مثل حرف الياء) خارج الحافة المرئية.
                  </p>
                </div>

                {/* Categorized 1.35 Solution */}
                <div className="p-4 rounded-lg border border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 font-arabic">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ✓ الحل المصحح: تحديد 1.35 لعناصر التحكم التفاعلية
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                      line-height: 1.35
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="h-9 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center justify-center border border-purple-700 shadow-xs"
                      style={{ lineHeight: 1.35 }}
                    >
                      تسجيل الحضور اليومي
                    </button>
                    <span
                      className="h-6 px-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-medium inline-flex items-center border border-emerald-200 dark:border-emerald-800"
                      style={{ lineHeight: 1.4 }}
                    >
                      مكتمل
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight">
                    محاذاة بصرية متناغمة بدقة بكسلية مع الحفاظ الكامل على الحركات والتنوين ونقاط الحروف دون أي قص في الارتفاع.
                  </p>
                </div>
              </div>
            </div>

            {/* Mixed-Language Rendering & Bidirectional Isolation (BiDi) */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      Bidirectional Text Isolation
                    </span>
                    <h3 className="font-bold text-base">Mixed Arabic & English Rendering Engine</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Using <code className="font-mono">&lt;bdi&gt;</code> and <code className="font-mono">unicode-bidi: isolate</code> to prevent directional flips when codes, numbers, and Latin identifiers appear in Arabic sentences.
                  </p>
                </div>
                <span className="text-xs font-mono bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded">
                  bidi-isolate
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                {/* Unisolated Flawed Example */}
                <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 font-arabic text-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                      ⚠️ بدون عزل اتجاهي (قد تختل الأقواس والأرقام)
                    </span>
                    <span className="text-[11px] font-mono text-amber-700">Raw Text</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-amber-200 dark:border-amber-800/50 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">رمز المساق والفصل:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        دورة CS-204 (الفصل الأول 2026/2027)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">رقم هاتف الطالب:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        +970 599 123 456
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    بدون عزل اتجاهي، تقوم خوارزمية Unicode بإعادة ترتيب الأقواس وعلامات الزائد ورموز المساقات بشكل غير متناسق مع اتجاه الجملة.
                  </p>
                </div>

                {/* Isolated Correct Example */}
                <div className="p-4 rounded-lg border border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 font-arabic text-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      ✓ مع العزل الاتجاهي (&lt;bdi&gt; & .bidi-code)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700">bidi-isolated</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded border border-emerald-200 dark:border-emerald-800/50 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">رمز المساق والفصل:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        دورة <bdi className="bidi-code font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">CS-204</bdi> (<bdi className="bidi-ltr">الفصل الأول 2026/2027</bdi>)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">رقم هاتف الطالب:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        <bdi className="bidi-ltr font-mono font-medium text-purple-700 dark:text-purple-300">+970 599 123 456</bdi>
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    يعزل المحتوى اللاتيني والأرقام تماماً عن تدفق النص العربي، مع ثبات كامل لمواقع الأقواس والرموز والأرقام البرمجية.
                  </p>
                </div>
              </div>
            </div>

            {/* Accessibility & Typography Sizing Matrix */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      WCAG AA Audit
                    </span>
                    <h3 className="font-bold text-base">Typography Sizing & Contrast Accessibility Matrix</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Strict guidelines prohibiting unreadable font sizes on crucial interface controls, data tables, and input fields.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                  WCAG AA Compliant
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Token & Size</th>
                      <th className="p-3">Design System Role</th>
                      <th className="p-3">Accessibility Constraint</th>
                      <th className="p-3">Contrast Ratio</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                        .type-micro (11px / 0.6875rem)
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        Micro timestamps, status dots, avatar indicators
                      </td>
                      <td className="p-3 text-amber-700 dark:text-amber-400 font-medium">
                        ⛔ FORBIDDEN for form labels, table cells, and button text
                      </td>
                      <td className="p-3 font-mono">14.8:1 (Primary) / 5.4:1 (Sec)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Restricted Role
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                        .type-caption (12px / 0.75rem)
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        Secondary helper notes beneath inputs, metadata badges
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        Secondary only. Must never be used for primary content.
                      </td>
                      <td className="p-3 font-mono">&ge; 4.5:1 (WCAG AA)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Secondary Only
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                        .type-body-sm (13px / 0.8125rem)
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        Form labels, compact table data cells, secondary actions
                      </td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 font-medium">
                        Minimum allowable size for form field labels & table data
                      </td>
                      <td className="p-3 font-mono">&ge; 5.4:1 (WCAG AA)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Approved for UI
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-purple-700 dark:text-purple-300">
                        .type-body (15px / 0.9375rem)
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        Standard body copy, paragraphs, interactive text inputs
                      </td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 font-medium">
                        Primary ergonomic standard across LTR and RTL
                      </td>
                      <td className="p-3 font-mono">14.8:1 (on canvas)</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Primary Standard
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: OVERVIEW & VISUAL DIRECTION
         * ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-900 to-[#24104f] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-purple-200 border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Modern Educational SaaS
                </span>
                <h2 className="text-3xl font-bold tracking-tight">
                  Calm, Purposeful & Precision-Built for Learning Management
                </h2>
                <p className="text-purple-200 text-sm leading-relaxed">
                  Academix 2.0 shifts away from low-contrast pastels and unstructured cards toward a high-density, accessible, and disciplined educational platform. The system preserves our recognizable purple heritage while establishing crisp information hierarchy, WCAG AA compliance, and ergonomic bilingual layouts.
                </p>
              </div>
            </div>

            {/* Design Principles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "1. Clarity Over Decoration",
                  desc: "Restrained surfaces, crisp borders, and purposeful hierarchy. Content and student assessments take center stage without distracting gimmicks.",
                  badge: "Content-First",
                },
                {
                  title: "2. WCAG AA Contrast Guaranteed",
                  desc: "Every text and interactive combination is calibrated to achieve at least 4.5:1 (normal text) and 3:1 (large/UI elements) contrast ratio.",
                  badge: "Accessibility",
                },
                {
                  title: "3. Ergonomic Bilingual Balance",
                  desc: "Built from the ground up to respect Arabic (RTL) and English (LTR) with optical consistency, logical CSS properties, and symmetrical rhythm.",
                  badge: "RTL + LTR",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3"
                >
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {item.badge}
                  </span>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Phase Roadmap Tracker */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
              <h3 className="font-semibold text-sm mb-4">Academix Step 2 Roadmap Alignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { phase: "Phase 1", title: "Design System", status: "Completed ✓" },
                  { phase: "Phase 2", title: "Bilingual Typography", status: "Active (Current)" },
                  { phase: "Phase 3", title: "Shared Components", status: "Next Up" },
                  { phase: "Phase 4", title: "Public Screens", status: "Pending" },
                  { phase: "Phase 5", title: "App Dashboards", status: "Pending" },
                  { phase: "Phase 6", title: "Final QA & Audit", status: "Pending" },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border text-xs ${
                      idx === 1
                        ? "border-purple-400 bg-purple-50/70 dark:bg-purple-950/40 font-semibold text-purple-900 dark:text-purple-200 shadow-xs"
                        : idx === 0
                        ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-medium"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                      {step.phase}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block mt-1">
                      {step.title}
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 block">
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: COLOR PALETTE & TOKENS
         * ========================================================================= */}
        {activeTab === "colors" && (
          <div className="space-y-10">
            {/* Primitive Scale: Purple Brand */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Signature Brand Purple Scale</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Primary brand identity. Purple-600 is our core action color; Purple-950 forms the deep anchor surface.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2.5">
                {Object.entries(primitives.purple).map(([weight, hex]) => (
                  <button
                    key={weight}
                    onClick={() => copyToClipboard(hex)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-28 text-left transition hover:scale-105 group relative"
                    style={{ backgroundColor: hex }}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        Number(weight) >= 400 ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {weight}
                    </span>
                    <div>
                      <span
                        className={`text-[10px] font-mono block uppercase ${
                          Number(weight) >= 400 ? "text-white/80" : "text-slate-700"
                        }`}
                      >
                        {hex}
                      </span>
                      <span
                        className={`text-[9px] block ${
                          Number(weight) >= 400 ? "text-white/60" : "text-slate-500"
                        }`}
                      >
                        {weight === "300"
                          ? "Signature Tint"
                          : weight === "600"
                          ? "Primary CTA"
                          : weight === "950"
                          ? "Deep Ink"
                          : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primitive Scale: Slate Neutral */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Slate Neutral Scale</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Surface backgrounds, borders, and high-readability typographic content.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
                {Object.entries(primitives.neutral).map(([weight, hex]) => (
                  <button
                    key={weight}
                    onClick={() => copyToClipboard(hex)}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-28 text-left transition hover:scale-105"
                    style={{ backgroundColor: hex }}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        Number(weight) >= 500 ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {weight}
                    </span>
                    <span
                      className={`text-[10px] font-mono block uppercase ${
                        Number(weight) >= 500 ? "text-white/80" : "text-slate-700"
                      }`}
                    >
                      {hex}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Semantic Feedback Colors */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Functional & Status Palettes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calibrated for clear status communication without visual fatigue.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Success */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Emerald (Success / Published)
                  </div>
                  <div className="flex gap-1.5">
                    {["#ecfdf5", "#a7f3d0", "#10b981", "#047857"].map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 h-10 rounded border border-black/10 flex items-center justify-center font-mono text-[9px]"
                        style={{ backgroundColor: c, color: i >= 2 ? "#fff" : "#000" }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4" /> Amber (Warning / Pending)
                  </div>
                  <div className="flex gap-1.5">
                    {["#fffbeb", "#fde68a", "#f59e0b", "#78350f"].map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 h-10 rounded border border-black/10 flex items-center justify-center font-mono text-[9px]"
                        style={{ backgroundColor: c, color: i >= 2 ? "#fff" : "#000" }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Destructive */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                    <XCircle className="w-4 h-4" /> Rose (Error / Rejected)
                  </div>
                  <div className="flex gap-1.5">
                    {["#fff1f2", "#fecdd3", "#e11d48", "#be123c"].map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 h-10 rounded border border-black/10 flex items-center justify-center font-mono text-[9px]"
                        style={{ backgroundColor: c, color: i >= 2 ? "#fff" : "#000" }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 space-y-2">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-semibold text-xs">
                    <Info className="w-4 h-4" /> Sky (Informational / Class)
                  </div>
                  <div className="flex gap-1.5">
                    {["#f0f9ff", "#bae6fd", "#0284c7", "#0369a1"].map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 h-10 rounded border border-black/10 flex items-center justify-center font-mono text-[9px]"
                        style={{ backgroundColor: c, color: i >= 2 ? "#fff" : "#000" }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Semantic Tokens Mapping Table */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Semantic Token Mapping Matrix</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  How components consume purpose-based tokens across light and dark modes.
                </p>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-3">Semantic Token</th>
                      <th className="p-3">CSS Variable</th>
                      <th className="p-3">Light Value</th>
                      <th className="p-3">Dark Value</th>
                      <th className="p-3">Primary Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      {
                        name: "Canvas",
                        css: "--color-canvas",
                        light: "#F8FAFC",
                        dark: "#020617",
                        use: "Default page background behind content",
                      },
                      {
                        name: "Surface",
                        css: "--color-surface",
                        light: "#FFFFFF",
                        dark: "#0F172A",
                        use: "Cards, containers, form backgrounds",
                      },
                      {
                        name: "Surface Muted",
                        css: "--color-surface-muted",
                        light: "#F1F5F9",
                        dark: "#1E293B",
                        use: "Table headers, subtle stripes, secondary wells",
                      },
                      {
                        name: "Surface Sidebar",
                        css: "--color-surface-sidebar",
                        light: "#24104F",
                        dark: "#0F0723",
                        use: "Primary deep brand navigation anchor",
                      },
                      {
                        name: "Primary Action",
                        css: "--color-primary",
                        light: "#7C3AED",
                        dark: "#8B5CF6",
                        use: "Primary buttons, active tabs, main action targets",
                      },
                      {
                        name: "Text Primary",
                        css: "--color-text-primary",
                        light: "#0F172A",
                        dark: "#F8FAFC",
                        use: "Headings, body copy, active labels (>12:1)",
                      },
                      {
                        name: "Text Secondary",
                        css: "--color-text-secondary",
                        light: "#475569",
                        dark: "#CBD5E1",
                        use: "Descriptions, secondary metadata (>6:1)",
                      },
                      {
                        name: "Border Default",
                        css: "--color-border-default",
                        light: "#E2E8F0",
                        dark: "#334155",
                        use: "Card outlines, dividers, table borders",
                      },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-semibold">{row.name}</td>
                        <td className="p-3 font-mono text-purple-600 dark:text-purple-400">
                          {row.css}
                        </td>
                        <td className="p-3 font-mono">{row.light}</td>
                        <td className="p-3 font-mono">{row.dark}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{row.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: SURFACES, ELEVATION & SHADOWS
         * ========================================================================= */}
        {activeTab === "surfaces" && (
          <div className="space-y-10">
            {/* Surface Hierarchy Cards */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Surface Layering Architecture</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hierarchical depth created through subtle luminance differences and clean borders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Layer 0 (Canvas)
                  </span>
                  <p className="text-sm font-semibold">Page Canvas</p>
                  <p className="text-xs text-slate-500">
                    The background behind cards and dashboard widgets.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600">
                    Layer 1 (Surface)
                  </span>
                  <p className="text-sm font-semibold">Content Card / Panel</p>
                  <p className="text-xs text-slate-500">
                    Default container for data tables, lists, and forms.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600">
                    Layer 2 (Elevated)
                  </span>
                  <p className="text-sm font-semibold">Dropdown / Popover</p>
                  <p className="text-xs text-slate-500">
                    Floating menus and interactive selects.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600">
                    Layer 3 (Modal)
                  </span>
                  <p className="text-sm font-semibold">Dialog / Modal</p>
                  <p className="text-xs text-slate-500">
                    Top-layer focused workflows over backdrop mask.
                  </p>
                </div>
              </div>
            </div>

            {/* Shadow Scale */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Restrained Elevation Shadows</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tinted ambient shadows using slate tones rather than harsh black.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: "shadow-xs", label: "Inputs & Badges", shadow: shadows.xs },
                  { name: "shadow-sm", label: "Cards & Buttons", shadow: shadows.sm },
                  { name: "shadow-md", label: "Dropdowns", shadow: shadows.md },
                  { name: "shadow-lg", label: "Drawers", shadow: shadows.lg },
                  { name: "shadow-xl", label: "Modals", shadow: shadows.xl },
                  { name: "shadow-glow", label: "CTA Glow", shadow: shadows.purple },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2"
                    style={{ boxShadow: s.shadow }}
                  >
                    <span className="text-xs font-mono font-bold block">{s.name}</span>
                    <span className="text-[10px] text-slate-500 block">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radius Scale */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Corner Radius Standards</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standardized curvature for consistent touch targets and aesthetic harmony.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { name: "xs", val: radii.xs, note: "Checkboxes" },
                  { name: "sm", val: radii.sm, note: "Pills / Tags" },
                  { name: "md", val: radii.md, note: "Inputs & Buttons" },
                  { name: "lg", val: radii.lg, note: "Cards (Default)" },
                  { name: "xl", val: radii.xl, note: "Dialogs" },
                  { name: "2xl", val: radii["2xl"], note: "Hero Panels" },
                  { name: "full", val: radii.full, note: "Avatars" },
                ].map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-center"
                    style={{ borderRadius: r.val }}
                  >
                    <span className="font-bold text-xs block font-mono">radius-{r.name}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-mono">
                      {r.val}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-1">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: SPACING & BREAKPOINTS
         * ========================================================================= */}
        {activeTab === "spacing" && (
          <div className="space-y-10">
            {/* 4px Base Spacing Scale */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">4px Base Spacing Scale</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mathematical rhythm guaranteeing alignment across nested tables, forms, and cards.
                </p>
              </div>

              <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900">
                {Object.entries(spacing).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4 text-xs font-mono">
                    <span className="w-16 text-slate-500">space-{key}</span>
                    <span className="w-16 font-semibold">{val}</span>
                    <div
                      className="h-4 bg-purple-600 rounded"
                      style={{ width: `calc(${val} * 3)` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Breakpoints Table */}
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">Responsive Breakpoint Conventions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standardized viewports ensuring desktop density, tablet stability, and mobile readability.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-3">Breakpoint</th>
                      <th className="p-3">Min-Width</th>
                      <th className="p-3">Target Devices</th>
                      <th className="p-3">Academix Layout Convention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      {
                        bp: "sm",
                        w: "640px",
                        devices: "Large phones & small tablets",
                        rule: "Form inputs go 2-column; table horizontal scroll active",
                      },
                      {
                        bp: "md",
                        w: "768px",
                        devices: "Tablets (Portrait)",
                        rule: "Table columns reveal core data; modals become centered dialogs",
                      },
                      {
                        bp: "lg",
                        w: "1024px",
                        devices: "Small laptops & landscape tablets",
                        rule: "Persistent left navigation dock; full data tables",
                      },
                      {
                        bp: "xl",
                        w: "1280px",
                        devices: "Standard desktop displays",
                        rule: "Two-column dashboard (2/3 main stage + 1/3 right rail)",
                      },
                      {
                        bp: "2xl",
                        w: "1536px",
                        devices: "Wide desktop displays",
                        rule: "Max-width container limits to preserve line-length readability",
                      },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-bold font-mono text-purple-600 dark:text-purple-400">
                          {row.bp}
                        </td>
                        <td className="p-3 font-mono">{row.w}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{row.devices}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{row.rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: COMPONENT TOKENS SPECIFICATIONS
         * ========================================================================= */}
        {activeTab === "components" && (
          <div className="space-y-10">
            {/* Interactive Buttons Preview */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-base">Button Component Tokens</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium text-xs transition shadow-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
                  Primary Action
                </button>
                <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition shadow-xs">
                  Secondary Action
                </button>
                <button className="px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-medium text-xs transition">
                  Subtle Action
                </button>
                <button className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition shadow-sm">
                  Destructive Action
                </button>
              </div>
            </div>

            {/* Inputs & Form Controls */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-base">Form Control Tokens</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Default Input
                  </label>
                  <input
                    type="text"
                    defaultValue="Mathematics 101"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-purple-400 focus:border-purple-600 focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Focused / Active State
                  </label>
                  <input
                    type="text"
                    defaultValue="Active focus indicator"
                    className="w-full px-3 py-2 rounded-lg border border-purple-600 ring-2 ring-purple-400/30 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Validation Error State
                  </label>
                  <input
                    type="text"
                    defaultValue="invalid@format"
                    className="w-full px-3 py-2 rounded-lg border border-rose-500 ring-2 ring-rose-400/20 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  />
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 block">
                    Please provide a valid educational domain.
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-base">Status Badge Tokens</h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Active / Present
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3 h-3" /> Pending Review
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <XCircle className="w-3 h-3" /> Absent / Paused
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <Info className="w-3 h-3" /> Grade 10 - Section B
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Published Exam
                </span>
              </div>
            </div>

            {/* Table Row Specification Preview */}
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-base">Data Table Design Tokens</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Latest Score</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition">
                      <td className="p-3 font-medium">Sarah Jenkins</td>
                      <td className="p-3 text-slate-500">10-A (Science)</td>
                      <td className="p-3 font-semibold text-purple-700 dark:text-purple-300">96 / 100</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Passed
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition">
                      <td className="p-3 font-medium">Omar Alsultan</td>
                      <td className="p-3 text-slate-500">10-A (Science)</td>
                      <td className="p-3 font-semibold text-purple-700 dark:text-purple-300">88 / 100</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          Passed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
         * TAB: TOKEN CONSUMPTION & ARCHITECTURE GUIDE
         * ========================================================================= */}
        {activeTab === "architecture" && (
          <div className="space-y-8">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <h3 className="font-bold text-lg">How Future Phases Consume Tokens</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tokens follow a strict three-layer hierarchy. Downstream components (Phase 3), public landing pages (Phase 4), and dashboard screens (Phase 5) should only reference **Semantic tokens** or **Tailwind theme utility classes**, never hardcoded HEX codes.
              </p>

              <div className="p-4 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs space-y-2 overflow-x-auto">
                <p className="text-purple-400">{"// Layer 1: Primitive (Raw value)"}</p>
                <p>--academix-purple-600: #7c3aed;</p>
                <p className="text-purple-400 mt-2">{"// Layer 2: Semantic (Purpose alias)"}</p>
                <p>--color-primary: var(--academix-purple-600);</p>
                <p className="text-purple-400 mt-2">{"// Layer 3: Component (Component-specific mapping)"}</p>
                <p>--btn-primary-bg: var(--color-primary);</p>
                <p className="text-emerald-400 mt-4">{"// Consumed in Tailwind / JSX:"}</p>
                <p>&lt;button className=&quot;bg-primaryAction hover:bg-primaryAction-hover text-white rounded-md shadow-sm&quot;&gt;</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <h4 className="font-semibold text-sm">Rules of Engagement</h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Never write inline arbitrary HEX codes (e.g. avoid <code>bg-[#7c3aed]</code>).</li>
                  <li>Use semantic background classes (<code>bg-surface</code>, <code>bg-canvas</code>).</li>
                  <li>Use semantic text classes (<code>text-content-primary</code>, <code>text-content-secondary</code>).</li>
                  <li>Respect logical directional utilities for RTL (<code>ms-*</code>, <code>pe-*</code>, <code>border-s</code>).</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <h4 className="font-semibold text-sm">Backward Compatibility</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  All legacy color names (<code>academixPurpleDark</code>, <code>academixInk</code>, <code>academixSurface</code>, etc.) remain fully functional in Tailwind configuration to prevent regressions across unconverted pages.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
