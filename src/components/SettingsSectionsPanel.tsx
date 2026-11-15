"use client";

import AcademicYearForm from "@/components/AcademicYearForm";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import WorkingDaysHolidaysForm from "@/components/WorkingDaysHolidaysForm";
import type { AcademicYearItem } from "@/lib/academicYears";
import type {
  SchoolDayExceptionItem,
  SchoolScheduleSettings,
} from "@/lib/schoolSettings";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type SectionKey = "schedule" | "workingDays" | "academicYears";

type Props = {
  settings: SchoolScheduleSettings;
  academicYears: AcademicYearItem[];
  dayExceptions: SchoolDayExceptionItem[];
};

const sections: { key: SectionKey; labelKey: string }[] = [
  { key: "schedule", labelKey: "scheduleDefaults" },
  { key: "workingDays", labelKey: "workingDaysHolidays" },
  { key: "academicYears", labelKey: "academicYears" },
];

const SettingsSectionsPanel = ({
  settings,
  academicYears,
  dayExceptions,
}: Props) => {
  const t = useTranslations("settings");
  const [activeSection, setActiveSection] = useState<SectionKey>("schedule");

  return (
    <div className="space-y-6">
      <nav aria-label="Settings sections">
        <ul className="flex flex-wrap gap-2 p-3 sm:p-4 bg-surface border border-outline/80 rounded-2xl shadow-2xs">
          {sections.map((section) => {
            const isActive = activeSection === section.key;

            return (
              <li key={section.key}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs",
                    isActive
                      ? "bg-brandPurple-600 text-white shadow-brandPurple-500/20 ring-2 ring-brandPurple-600/30 font-bold"
                      : "bg-surface border border-outline/80 text-content-secondary hover:text-content-primary hover:bg-surface-muted hover:border-outline"
                  )}
                  aria-pressed={isActive}
                >
                  {t(`sections.${section.labelKey}`)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeSection === "schedule" ? (
        <section className="space-y-4 max-w-3xl">
          <SchoolSettingsForm initialSettings={settings} />
        </section>
      ) : activeSection === "workingDays" ? (
        <section className="space-y-4 max-w-4xl">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-lg text-content-primary tracking-tight">
              {t("sections.workingDaysHolidays")}
            </h2>
            <p className="text-xs sm:text-sm text-content-muted">
              {t("workingDaysDescription")}
            </p>
          </div>

          <WorkingDaysHolidaysForm
            initialWorkingDays={settings.workingDays}
            exceptions={dayExceptions}
          />
        </section>
      ) : (
        <section className="space-y-4 max-w-4xl">
          <AcademicYearForm academicYears={academicYears} />
        </section>
      )}
    </div>
  );
};

export default SettingsSectionsPanel;
