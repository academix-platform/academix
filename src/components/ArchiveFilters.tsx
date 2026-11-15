"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Layers } from "lucide-react";

type AcademicYear = {
  id: number | string;
  name: string;
};

const ArchiveFilters = ({
  academicYears,
  selectedType,
  selectedYear,
}: {
  academicYears: AcademicYear[];
  selectedType: string;
  selectedYear: string;
}) => {
  const t = useTranslations("filters");
  const router = useRouter();

  const updateFilters = (type: string, year: string) => {
    router.push(`/archive?type=${type}&academicYearId=${year}`);
  };

  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 shadow-2xs border border-outline/80">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
            <Layers className="w-3.5 h-3.5 text-brandPurple-600 dark:text-brandPurple-400" />
            <span>{t("dataType")}</span>
          </label>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => updateFilters(e.target.value, selectedYear)}
              className="w-full bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-content-primary outline-none focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 transition-all cursor-pointer font-medium"
            >
              <option value="students">{t("students")}</option>
              <option value="teachers">{t("teachers")}</option>
              <option value="parents">{t("parents")}</option>
              <option value="exams">{t("exams")}</option>
              <option value="assignments">{t("assignments")}</option>
              <option value="results">{t("results")}</option>
              <option value="attendance">{t("attendance")}</option>
              <option value="subjects">{t("subjects")}</option>
              <option value="classes">{t("classes")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
            <Calendar className="w-3.5 h-3.5 text-brandPurple-600 dark:text-brandPurple-400" />
            <span>{t("academicYear")}</span>
          </label>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => updateFilters(selectedType, e.target.value)}
              className="w-full bg-surface-muted/50 border border-outline/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-content-primary outline-none focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 transition-all cursor-pointer font-medium"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveFilters;
