"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const updateFilters = (type: string, year: string) => {
    router.push(`/archive?type=${type}&academicYearId=${year}`);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Data Type
          </label>

          <select
            value={selectedType}
            onChange={(e) => updateFilters(e.target.value, selectedYear)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
          >
            <option value="students">Students</option>
            <option value="teachers">Teachers</option>
            <option value="parents">Parents</option>
            <option value="exams">Exams</option>
            <option value="assignments">Assignments</option>
            <option value="results">Results</option>
            <option value="attendance">Attendance</option>
            <option value="subjects">Subjects</option>
            <option value="classes">Classes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Academic Year
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