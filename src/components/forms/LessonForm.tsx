"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  lessonDays,
  lessonScheduleSchema,
  type LessonScheduleSchema,
} from "@/lib/formValidationSchemas";
import { saveLessonSchedule } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type DayValue = (typeof lessonDays)[number];
type SlotValue = 1 | 2 | 3 | 4 | 5 | 6;

type RelatedData = {
  classes?: Array<{ id: number; name: string }>;
  subjects?: Array<{ id: number; name: string }>;
  teachers?: Array<{
    id: string;
    name: string;
    subjects?: Array<{ id: number }>;
  }>;
  lessons?: Array<{
    id: number;
    classId: number;
    day: DayValue;
    name: string;
    subjectId: number;
    teacherId?: string;
    teacher?: { name: string };
  }>;
};

const dayLabels: Record<DayValue, string> = {
  SATURDAY: "SAT",
  SUNDAY: "SUN",
  MONDAY: "MON",
  TUESDAY: "TUE",
  WEDNESDAY: "WED",
  THURSDAY: "THU",
};

const slotNumbers = [1, 2, 3, 4, 5, 6] as const;

const buildInitialEntries = () => {
  return lessonDays.flatMap((day) =>
    slotNumbers.map((slot) => ({
      day,
      slot,
      subjectId: null as number | null,
      teacherId: null as string | null,
    })),
  );
};

const extractSlotFromName = (name?: string) => {
  if (!name) return null;
  const match = /lesson\s*(\d+)/i.exec(name);
  if (!match) return null;
  const slot = Number(match[1]);
  if (Number.isNaN(slot) || slot < 1 || slot > 6) return null;
  return slot as SlotValue;
};

const getGradeFromClassName = (name?: string) => {
  if (!name) return null;
  const match = /^(\d+)/.exec(name.trim());
  if (!match) return null;
  const grade = Number(match[1]);
  return Number.isNaN(grade) ? null : grade;
};

const getGradeFromSubjectName = (name?: string) => {
  if (!name) return null;
  const match = /-G(\d+)$/i.exec(name.trim());
  if (!match) return null;
  const grade = Number(match[1]);
  return Number.isNaN(grade) ? null : grade;
};

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: { classId?: number; day?: DayValue };
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: RelatedData;
}) => {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [activeDay, setActiveDay] = useState<DayValue>(data?.day ?? "SATURDAY");

  const {
    classes = [],
    subjects = [],
    teachers = [],
    lessons = [],
  } = relatedData ?? {};

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, submitCount },
  } = useForm<LessonScheduleSchema>({
    resolver: zodResolver(lessonScheduleSchema),
    defaultValues: {
      classId: data?.classId,
      entries: buildInitialEntries(),
    },
  });

  const selectedClassId = useWatch({ control, name: "classId" });
  const entries = useWatch({ control, name: "entries" }) ?? [];

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === Number(selectedClassId)),
    [classes, selectedClassId],
  );

  const selectedClassGrade = useMemo(
    () => getGradeFromClassName(selectedClass?.name),
    [selectedClass],
  );

  const filteredSubjects = useMemo(() => {
    if (!selectedClassGrade) return [];
    return subjects.filter(
      (subject) => getGradeFromSubjectName(subject.name) === selectedClassGrade,
    );
  }, [selectedClassGrade, subjects]);

  const teacherOptionsBySubject = useMemo(() => {
    const map = new Map<number, Array<{ id: string; name: string }>>();

    for (const teacher of teachers) {
      for (const subject of teacher.subjects ?? []) {
        const options = map.get(subject.id) ?? [];
        options.push({ id: teacher.id, name: teacher.name });
        map.set(subject.id, options);
      }
    }

    return map;
  }, [teachers]);

  const getTeacherNameById = useCallback(
    (teacherId?: string | null) => {
      if (!teacherId) return null;
      return teachers.find((teacher) => teacher.id === teacherId)?.name ?? null;
    },
    [teachers],
  );

  const activeRows = useMemo(() => {
    return slotNumbers.map((slot) => {
      const index =
        lessonDays.findIndex((day) => day === activeDay) * 6 + (slot - 1);
      return { slot, index };
    });
  }, [activeDay]);

  const applyClassSchedule = useCallback(
    (classIdValue?: number) => {
      const classId = Number(classIdValue);
      if (Number.isNaN(classId) || classId <= 0) {
        setValue("entries", buildInitialEntries(), {
          shouldDirty: true,
          shouldValidate: true,
        });
        return;
      }

      const nextEntries = buildInitialEntries();

      for (const lesson of lessons) {
        if (lesson.classId !== classId) continue;
        const dayIndex = lessonDays.findIndex((day) => day === lesson.day);
        if (dayIndex < 0) continue;

        const slot = extractSlotFromName(lesson.name);
        if (!slot) continue;

        const index = dayIndex * 6 + (slot - 1);
        if (!nextEntries[index]) continue;

        nextEntries[index] = {
          day: lesson.day,
          slot,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId ?? null,
        };
      }

      setValue("entries", nextEntries, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [lessons, setValue],
  );

  useEffect(() => {
    if (selectedClassId) {
      applyClassSchedule(Number(selectedClassId));
    }
  }, [selectedClassId, applyClassSchedule]);

  const onClassChange = (raw: string) => {
    const classId = Number(raw);
    setValue(
      "classId",
      Number.isNaN(classId) ? (undefined as never) : classId,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    applyClassSchedule(classId);
  };

  const setSlotSubject = (entryIndex: number, rawValue: string) => {
    const value = Number(rawValue);
    const nextSubjectId = Number.isNaN(value) || value <= 0 ? null : value;
    const currentTeacherId = entries[entryIndex]?.teacherId ?? null;
    const allowedTeachers = nextSubjectId
      ? (teacherOptionsBySubject.get(nextSubjectId) ?? [])
      : [];

    setValue(`entries.${entryIndex}.subjectId`, nextSubjectId, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (
      !nextSubjectId ||
      (currentTeacherId &&
        !allowedTeachers.some((teacher) => teacher.id === currentTeacherId))
    ) {
      setValue(`entries.${entryIndex}.teacherId`, null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const setSlotTeacher = (entryIndex: number, rawValue: string) => {
    setValue(`entries.${entryIndex}.teacherId`, rawValue || null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = handleSubmit((formValues) => {
    startTransition(async () => {
      try {
        const result = await saveLessonSchedule(
          { success: false, error: false },
          formValues,
        );

        if (result.success) {
          toast("Weekly lesson schedule has been saved.");
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      } catch {
        toast.error("Something went wrong!");
      }
    });
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create"
          ? "Create weekly lesson schedule"
          : "Update weekly lesson schedule"}
      </h1>

      <div className="flex flex-col gap-2 w-full md:w-1/3">
        <label className="text-gray-500 text-xs">Class</label>
        <select
          className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
          value={selectedClassId ?? ""}
          onChange={(e) => onClassChange(e.target.value)}
        >
          <option value="">Select class</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
            </option>
          ))}
        </select>
        {errors.classId?.message && (
          <p className="text-red-400 text-xs">
            {errors.classId.message.toString()}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {lessonDays.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(day)}
            className={`px-3 py-2 rounded-md text-sm font-medium border ${
              activeDay === day
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {dayLabels[day]}
          </button>
        ))}
      </div>

      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        {activeRows.map(({ slot, index }) => {
          const currentSubjectId = entries[index]?.subjectId ?? null;
          const currentTeacherId = entries[index]?.teacherId ?? null;
          const teacherOptions = currentSubjectId
            ? (teacherOptionsBySubject.get(Number(currentSubjectId)) ?? [])
            : [];
          const teacherName = getTeacherNameById(currentTeacherId);
          const teacherError = errors.entries?.[index]?.teacherId?.message;

          return (
            <div
              key={`${activeDay}-${slot}`}
              className="flex flex-col gap-2 p-3 rounded-md ring-1 ring-gray-200"
            >
              <p className="font-medium text-sm">
                Lesson {slot}
                {teacherName ? (
                  <span className="ml-2 font-normal text-gray-500 text-xs">
                    - {teacherName}
                  </span>
                ) : null}
              </p>
              <div className="gap-2 grid md:grid-cols-2">
                <select
                  className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
                  value={currentSubjectId ?? ""}
                  onChange={(e) => setSlotSubject(index, e.target.value)}
                  disabled={!selectedClassId}
                >
                  <option value="">No subject</option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>

                <select
                  className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
                  value={currentTeacherId ?? ""}
                  onChange={(e) => setSlotTeacher(index, e.target.value)}
                  disabled={!currentSubjectId}
                >
                  <option value="">Select teacher</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              {submitCount > 0 && teacherError && (
                <p className="text-amber-700 text-xs">Select a teacher</p>
              )}
            </div>
          );
        })}
      </div>

      <input
        type="hidden"
        {...register("classId")}
        value={selectedClassId ?? ""}
      />
      {buildInitialEntries().map((entry, index) => {
        const current = getValues(`entries.${index}`) ?? entry;
        return (
          <div key={`${entry.day}-${entry.slot}-hidden`} className="hidden">
            <input
              type="hidden"
              {...register(`entries.${index}.day`)}
              value={current.day}
            />
            <input
              type="hidden"
              {...register(`entries.${index}.slot`)}
              value={current.slot}
            />
            <input
              type="hidden"
              {...register(`entries.${index}.subjectId`)}
              value={current.subjectId ?? ""}
            />
            <input
              type="hidden"
              {...register(`entries.${index}.teacherId`)}
              value={current.teacherId ?? ""}
            />
          </div>
        );
      })}

      {errors.entries?.message && (
        <p className="text-red-400 text-xs">
          {errors.entries.message.toString()}
        </p>
      )}

      <button
        className="bg-blue-400 disabled:opacity-60 p-2 rounded-md text-white"
        disabled={isSubmitting}
      >
        Save Weekly Schedule
      </button>
    </form>
  );
};

export default LessonForm;
