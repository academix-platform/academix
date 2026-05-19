"use client";

import AcademicYearForm from "@/components/AcademicYearForm";
import SchoolSettingsForm from "@/components/SchoolSettingsForm";
import WorkingDaysHolidaysForm from "@/components/WorkingDaysHolidaysForm";
import type { AcademicYearItem } from "@/lib/academicYears";
import type {
  SchoolDayExceptionItem,
  SchoolScheduleSettings,
} from "@/lib/schoolSettings";
import { useState } from "react";

type SectionKey = "schedule" | "workingDays" | "academicYears";

type Props = {
  settings: SchoolScheduleSettings;
  academicYears: AcademicYearItem[];
  dayExceptions: SchoolDayExceptionItem[];
};

const sections: { key: SectionKey; label: string }[] = [
  { key: "schedule", label: "Schedule Defaults" },
  { key: "workingDays", label: "Working Days & Holidays" },
  { key: "academicYears", label: "Academic Years" },
];

const SettingsSectionsPanel = ({
  settings,
  academicYears,
  dayExceptions,
}: Props) => {
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
                  {section.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeSection === "schedule" ? (
        <section className="pt-6 max-w-3xl">
          <h2 className="font-semibold text-lg">Schedule Defaults</h2>
          <p className="mt-2 text-gray-500 text-sm">
            Configure weekly schedule defaults used by lessons and calendar
            rendering.
          </p>

          <div className="mt-4">
            <SchoolSettingsForm initialSettings={settings} />
          </div>
        </section>
      ) : activeSection === "workingDays" ? (
        <section className="pt-6 max-w-4xl">
          <h2 className="font-semibold text-lg">Working Days and Holidays</h2>
          <p className="mt-2 text-gray-500 text-sm">
            Define school working days and add date-specific holidays or off-day
            overrides.
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
