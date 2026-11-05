"use client";

import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  Layers,
  CalendarCheck2,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

type StepConfig = {
  key: "account" | "setup" | "operations" | "outcomes";
  stepNum: string;
  icon: typeof UserPlus;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

const steps: StepConfig[] = [
  {
    key: "account",
    stepNum: "01",
    icon: UserPlus,
    accentBg: "bg-brandPurple-50",
    accentBorder: "border-brandPurple-200/80",
    accentText: "text-brandPurple-600",
    badgeBg: "bg-brandPurple-50",
    badgeText: "text-brandPurple-700",
    badgeBorder: "border-brandPurple-200/80",
  },
  {
    key: "setup",
    stepNum: "02",
    icon: Layers,
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200/80",
    accentText: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    badgeBorder: "border-blue-200/80",
  },
  {
    key: "operations",
    stepNum: "03",
    icon: CalendarCheck2,
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200/80",
    accentText: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200/80",
  },
  {
    key: "outcomes",
    stepNum: "04",
    icon: BarChart3,
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200/80",
    accentText: "text-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200/80",
  },
];

const HowItWorksSection = () => {
  const t = useTranslations("home.howItWorks");

  return (
    <RevealSection>
      <section
        id="how-it-works"
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
            <p className="mt-4 text-content-secondary text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Stepped Workflow Grid & Connected Timeline */}
          <div className="relative mt-14 md:mt-18">
            {/* Desktop Continuous Connector Track (RTL & LTR Aware) */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-10 inset-x-12 h-0.5 bg-gradient-to-r from-brandPurple-300 via-blue-300 to-emerald-300 rtl:bg-gradient-to-l pointer-events-none"
            />

            {/* Mobile Vertical Connected Track + Desktop 4-Col Grid */}
            <div className="relative border-s-2 border-dashed border-brandPurple-200 ms-3 ps-6 sm:ms-4 sm:ps-8 lg:border-none lg:m-0 lg:p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.key}
                    className="group relative bg-surface p-6 sm:p-7 border border-outline hover:border-brandPurple-300/80 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-start flex flex-col justify-between"
                  >
                    {/* Mobile Timeline Node Pin */}
                    <span
                      aria-hidden="true"
                      className="lg:hidden absolute -start-[31px] sm:-start-[39px] top-6 w-3 h-3 rounded-full bg-brandPurple-600 ring-4 ring-canvas-subtle"
                    />

                    <div className="space-y-4">
                      {/* Unified Card Header: Step Number Pill + Lucide Icon */}
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-brandPurple-800 bg-brandPurple-50 border border-brandPurple-200/80 px-2.5 py-1 rounded-lg tabular-nums shadow-2xs">
                          {step.stepNum}
                        </span>
                        <div
                          className={`inline-flex justify-center items-center w-11 h-11 rounded-xl border shadow-2xs transition-colors duration-200 ${step.accentBg} ${step.accentBorder} ${step.accentText} group-hover:scale-105`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Step Title & Specific Milestone Tag */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-content-primary group-hover:text-brandPurple-700 transition-colors duration-200">
                          {t(`steps.${step.key}.title`)}
                        </h3>
                        <span
                          className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${step.badgeBg} ${step.badgeBorder} ${step.badgeText}`}
                        >
                          {t(`steps.${step.key}.milestone`)}
                        </span>
                      </div>

                      {/* Step Description */}
                      <p className="text-content-secondary text-sm leading-relaxed">
                        {t(`steps.${step.key}.description`)}
                      </p>
                    </div>

                    {/* Clean Progress Indicator (Replaces Repetitive Footer) */}
                    <div className="mt-5 pt-3.5 border-t border-outline flex items-center justify-between text-xs text-content-muted">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-content-secondary">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t(`steps.${step.key}.title`)}</span>
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-content-muted">
                        {step.stepNum}/04
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default HowItWorksSection;
