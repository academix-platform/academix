"use client";

import { useMemo, useState, type ReactNode } from "react";

type SectionId = "assignments" | "exams" | "materials";

const SECTION_LABELS: Record<SectionId, string> = {
  materials: "Materials",
  assignments: "Assignments",
  exams: "Exams",
};

interface Props {
  sectionsOrder: string[];
  assignmentsContent: ReactNode;
  examsContent: ReactNode;
  materialsContent: ReactNode;
}

export default function SubjectDetailsTabs({
  sectionsOrder,
  assignmentsContent,
  examsContent,
  materialsContent,
}: Props) {
  const availableSections = useMemo(
    () =>
      sectionsOrder.filter(
        (section): section is SectionId =>
          section === "materials" ||
          section === "assignments" ||
          section === "exams",
      ),
    [sectionsOrder],
  );
  const orderedSections = useMemo(() => {
    if (!availableSections.includes("materials")) return availableSections;

    return [
      "materials",
      ...availableSections.filter((section) => section !== "materials"),
    ] as SectionId[];
  }, [availableSections]);

  const [activeSection, setActiveSection] = useState<SectionId>(
    orderedSections.includes("materials")
      ? "materials"
      : (orderedSections[0] ?? "assignments"),
  );

  return (
    <>
      <div className="bg-white shadow-sm p-2 border border-gray-100 rounded-xl">
        <div className="flex flex-wrap gap-2">
          {orderedSections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section
                  ? "bg-purple-600 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              {SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "assignments" && assignmentsContent}
      {activeSection === "exams" && examsContent}
      {activeSection === "materials" && materialsContent}
    </>
  );
}
