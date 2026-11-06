"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("dataType")}
          </label>

          <select
            value={selectedType}
            onChange={(e) => updateFilters(e.target.value, selectedYear)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
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

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("academicYear")}
          </label>

          <select
            value={selectedYear}
            onChange={(e) => updateFilters(selectedType, e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
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
  );
};

export default ArchiveFilters;
