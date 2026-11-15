"use client";

import {
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import RevealSection from "./RevealSection";
import { useTranslations } from "next-intl";
import { useState, useRef, KeyboardEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type RoleKey = "administrator" | "teacher" | "student" | "parent";

const rolesList: {
  key: RoleKey;
  icon: typeof ShieldCheck;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  tabActiveBg: string;
  checkColor: string;
  actions: string[];
}[] = [
  {
    key: "administrator",
    icon: ShieldCheck,
    badgeBg: "bg-brandPurple-50",
    badgeBorder: "border-brandPurple-200",
    badgeText: "text-brandPurple-700",
    tabActiveBg: "bg-brandPurple-600 text-white shadow-sm",
    checkColor: "text-brandPurple-600",
    actions: ["users", "settings", "reports", "operations"],
  },
  {
    key: "teacher",
    icon: GraduationCap,
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-200",
    badgeText: "text-blue-700",
    tabActiveBg: "bg-blue-600 text-white shadow-sm",
    checkColor: "text-blue-600",
    actions: ["assessments", "attendance", "grading", "resources"],
  },
  {
    key: "student",
    icon: Sparkles,
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    badgeText: "text-amber-800",
    tabActiveBg: "bg-amber-600 text-white shadow-sm",
    checkColor: "text-amber-600",
    actions: ["courses", "assignments", "grades", "attendance"],
  },
  {
    key: "parent",
    icon: HeartHandshake,
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    badgeText: "text-emerald-700",
    tabActiveBg: "bg-emerald-600 text-white shadow-sm",
    checkColor: "text-emerald-600",
    actions: ["progress", "attendance", "announcements", "schedule"],
  },
];

const RolesSection = () => {
  const t = useTranslations("home.roles");
  const [activeRole, setActiveRole] = useState<RoleKey>("administrator");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = rolesList.findIndex((r) => r.key === activeRole);
  const currentRole = rolesList[activeIndex] || rolesList[0];

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % rolesList.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + rolesList.length) % rolesList.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = rolesList.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveRole(rolesList[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <RevealSection>
      <section id="roles" className="relative mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 max-w-7xl">
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

        {/* Accessible Segmented Role Switcher Tabs */}
        <div className="mt-12 flex justify-center">
          <div
            role="tablist"
            aria-label={t("title")}
            className="inline-flex p-1.5 rounded-2xl bg-canvas-subtle border border-outline shadow-2xs max-w-full overflow-x-auto"
          >
            {rolesList.map((role, idx) => {
              const isSelected = activeRole === role.key;
              const Icon = role.icon;
              return (
                <button
                  key={role.key}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={`role-tab-${role.key}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`role-panel-${role.key}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveRole(role.key)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 cursor-pointer ${
                    isSelected
                      ? role.tabActiveBg
                      : "text-content-secondary hover:text-content-primary hover:bg-surface/80"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t(`items.${role.key}.title`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Spotlight Canvas */}
        <div className="mt-8">
          <div
            id={`role-panel-${currentRole.key}`}
            role="tabpanel"
            aria-labelledby={`role-tab-${currentRole.key}`}
            tabIndex={0}
            className="rounded-3xl border border-outline bg-surface p-6 sm:p-10 md:p-12 shadow-xl ring-1 ring-black/5 text-start transition-all duration-300"
          >
            <div className="grid md:grid-cols-12 gap-10 items-center">
              {/* Left Column: Responsibilities & Actions */}
              <div className="md:col-span-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex justify-center items-center w-12 h-12 rounded-2xl border shadow-2xs ${currentRole.badgeBg} ${currentRole.badgeBorder} ${currentRole.badgeText}`}
                  >
                    <currentRole.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                      {t("badge")}
                    </span>
                    <h3 className="font-extrabold text-2xl text-content-primary tracking-tight">
                      {t(`items.${currentRole.key}.title`)}
                    </h3>
                  </div>
                </div>

                <p className="text-content-secondary text-base sm:text-lg leading-relaxed">
                  {t(`items.${currentRole.key}.description`)}
                </p>

                {/* Key Capabilities Checklist */}
                <div className="space-y-3 pt-4 border-t border-outline">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-content-primary">
                    {t("coreTasks")}
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {currentRole.actions.map((action) => (
                      <div
                        key={action}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas-subtle/80 border border-outline/60 text-xs sm:text-sm font-medium text-content-primary"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${currentRole.checkColor}`}
                        />
                        <span>{t(`items.${currentRole.key}.actions.${action}`)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Tailored Role Workspace Mockup */}
              <div className="md:col-span-6">
                <div className="rounded-2xl border border-outline bg-canvas-subtle/90 p-5 sm:p-6 shadow-sm space-y-4">
                  {/* Workspace Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-outline">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-content-primary">
                        {currentRole.key === "administrator"
                          ? t("adminWorkspaceBadge")
                          : currentRole.key === "teacher"
                          ? t("teacherWorkspaceBadge")
                          : currentRole.key === "student"
                          ? t("studentWorkspaceBadge")
                          : t("parentWorkspaceBadge")}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-content-muted">
                      {t("workspaceTitle")}
                    </span>
                  </div>

                  <p className="text-content-secondary text-xs leading-relaxed">
                    {currentRole.key === "administrator"
                      ? t("adminWorkspaceDetail")
                      : currentRole.key === "teacher"
                      ? t("teacherWorkspaceDetail")
                      : currentRole.key === "student"
                      ? t("studentWorkspaceDetail")
                      : t("parentWorkspaceDetail")}
                  </p>

                  {/* Role Specific Visual Widget */}
                  {currentRole.key === "administrator" && (
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("adminItem1Label")}</span>
                        <span className="font-bold text-content-primary">{t("adminItem1Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("adminItem2Label")}</span>
                        <span className="font-semibold text-brandPurple-700">{t("adminItem2Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("adminItem3Label")}</span>
                        <span className="text-emerald-700 font-medium">{t("adminItem3Val")}</span>
                      </div>
                    </div>
                  )}

                  {currentRole.key === "teacher" && (
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("teacherItem1Label")}</span>
                        <span className="font-bold text-content-primary">{t("teacherItem1Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("teacherItem2Label")}</span>
                        <span className="font-semibold text-emerald-700">{t("teacherItem2Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("teacherItem3Label")}</span>
                        <span className="text-blue-700 font-medium">{t("teacherItem3Val")}</span>
                      </div>
                    </div>
                  )}

                  {currentRole.key === "student" && (
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("studentItem1Label")}</span>
                        <span className="font-bold text-content-primary">{t("studentItem1Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("studentItem2Label")}</span>
                        <span className="font-semibold text-amber-700">{t("studentItem2Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("studentItem3Label")}</span>
                        <span className="text-brandPurple-700 font-bold tabular-nums">{t("studentItem3Val")}</span>
                      </div>
                    </div>
                  )}

                  {currentRole.key === "parent" && (
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("parentItem1Label")}</span>
                        <span className="font-bold text-content-primary">{t("parentItem1Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("parentItem2Label")}</span>
                        <span className="font-semibold text-emerald-700">{t("parentItem2Val")}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline">
                        <span className="text-content-secondary">{t("parentItem3Label")}</span>
                        <span className="text-blue-700 font-medium">{t("parentItem3Val")}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Link href="/sign-in">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />}
                      >
                        {t("portalCta")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </RevealSection>
  );
};

export default RolesSection;
