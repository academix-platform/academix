"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ClipboardList, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionId = "assignments" | "exams" | "materials";

interface Props {
  sectionsOrder: string[];
  assignmentsContent: ReactNode;
  examsContent: ReactNode;
  materialsContent: ReactNode;
}

const SECTION_ICONS: Record<SectionId, React.ElementType> = {
  materials: BookOpen,
  assignments: ClipboardList,
  exams: FileText,
};

export default function SubjectDetailsTabs({
  sectionsOrder,
  assignmentsContent,
  examsContent,
  materialsContent,
}: Props) {
  const t = useTranslations("subjectDetails");
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
    <div className="space-y-4">
      <div className="p-1 bg-surface-muted/60 dark:bg-surface-muted border border-outline/70 rounded-xl inline-flex flex-wrap gap-1 shadow-2xs">
        {orderedSections.map((section) => {
          const Icon = SECTION_ICONS[section];
          const isActive = activeSection === section;

          return (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer select-none",
                isActive
                  ? "bg-surface text-brandPurple-600 dark:text-brandPurple-400 font-bold shadow-2xs"
                  : "text-content-secondary hover:text-content-primary hover:bg-surface/50",
              )}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span>{t(`tabs.${section}`)}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeSection === "assignments" && assignmentsContent}
        {activeSection === "exams" && examsContent}
        {activeSection === "materials" && materialsContent}
      </div>
    </div>
  );
}
