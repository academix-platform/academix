"use client";

import AcademicYearForm from "@/components/AcademicYearForm";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import WorkingDaysHolidaysForm from "@/components/WorkingDaysHolidaysForm";
import type { AcademicYearItem } from "@/lib/academicYears";
import type {
  SchoolDayExceptionItem,
  SchoolScheduleSettings,
} from "@/lib/schoolSettings";
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
    <>
      <nav aria-label="Settings sections" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const isActive = activeSection === section.key;

            return (
              <li key={section.key}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`inline-flex px-3 py-1.5 border rounded-md font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-academixPurpleLight border-academixPurpleDark text-academixPurpleDark"
                      : "hover:bg-academixPurpleLight border-gray-200 text-gray-700 hover:text-academixPurpleDark"
                  }`}
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
        <section className="pt-6 max-w-3xl">
          <h2 className="font-semibold text-lg">{t("sections.scheduleDefaults")}</h2>
          <p className="mt-2 text-gray-500 text-sm">
            {t("description")}
          </p>

          <div className="mt-4">
            <SchoolSettingsForm initialSettings={settings} />
          </div>
        </section>
      ) : activeSection === "workingDays" ? (
        <section className="pt-6 max-w-4xl">
          <h2 className="font-semibold text-lg">{t("sections.workingDaysHolidays")}</h2>
          <p className="mt-2 text-gray-500 text-sm">
            {t("workingDaysDescription")}
          </p>

          <div className="mt-4">
            <WorkingDaysHolidaysForm
              initialWorkingDays={settings.workingDays}
              exceptions={dayExceptions}
            />
          </div>
        </section>
      ) : (
        <section className="pt-6 max-w-4xl">
          <div className="mt-4">
            <AcademicYearForm academicYears={academicYears} />
          </div>
        </section>
      )}
    </>
  );
};

export default SettingsSectionsPanel;
