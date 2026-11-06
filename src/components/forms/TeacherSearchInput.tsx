"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type TeacherOption = {
  id: string;
  name: string;
};

type TeacherSearchInputProps = {
  teachers: TeacherOption[];
  value?: string | null;
  onChange: (teacherId: string | null) => void;
  label?: string;
};

export default function TeacherSearchInput({
  teachers,
  value,
  onChange,
  label,
}: TeacherSearchInputProps) {
  const tableT = useTranslations("tableHeaders");
  const commonT = useTranslations("forms.common");
  const actionsT = useTranslations("actions");
  const selectedTeacher = teachers.find((teacher) => teacher.id === value);
  const [search, setSearch] = useState(selectedTeacher?.name ?? "");
  const [open, setOpen] = useState(false);

  const filteredTeachers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return teachers;

    return teachers.filter((teacher) =>
      teacher.name.toLowerCase().includes(keyword),
    );
  }, [search, teachers]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="font-medium text-gray-700 text-sm">
        {label ?? tableT("teacher")}
        <span className="ms-1 font-normal text-gray-400">
          ({commonT("optional")})
        </span>
      </label>
      <div className="relative">
        <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            placeholder={commonT("searchTeachers")}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            className="bg-transparent outline-none w-full text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                onChange(null);
                setOpen(true);
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label={actionsT("clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {open && (
          <div className="top-full inset-x-0 z-20 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => {
                const isSelected = teacher.id === value;

                return (
                  <button
                    type="button"
                    key={teacher.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(teacher.id);
                      setSearch(teacher.name);
                      setOpen(false);
                    }}
                    className={`px-4 py-3 w-full text-sm text-start transition-colors ${
                      isSelected
                        ? "bg-academixPurpleLight text-academixPurpleDark font-medium"
                        : "hover:bg-academixPurpleLight hover:text-academixPurpleDark"
                    }`}
                  >
                    {teacher.name}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm">
                {commonT("noTeachersFound")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
