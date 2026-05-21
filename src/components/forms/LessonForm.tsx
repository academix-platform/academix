"use client";

import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/actions/notification";
import { getSchoolId } from "@/lib/getSchoolId";

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

type RelatedData = {
  classes?: Array<{ id: number; name: string; gradeId?: number }>;
  subjects?: Array<{ id: number; name: string; gradeId?: number }>;
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
    startTime?: Date;
    subjectId: number;
    teacherId?: string;
    teacher?: { name: string };
  }>;
  schoolSettings?: {
    lessonsPerDay: number;
    lessonDurationMinutes: number;
    workDayStartHour: number;
    workDayStartMinute: number;
    workDayEndHour: number;
    workDayEndMinute: number;
  };
};

const dayLabels: Record<DayValue, string> = {
  SATURDAY: "SAT",
  SUNDAY: "SUN",
  MONDAY: "MON",
  TUESDAY: "TUE",
  WEDNESDAY: "WED",
  THURSDAY: "THU",
};

const buildSlotNumbers = (lessonsPerDay: number) =>
  Array.from({ length: lessonsPerDay }, (_, index) => index + 1);

const buildInitialEntries = (slotNumbers: number[]) => {
  return lessonDays.flatMap((day) =>
    slotNumbers.map((slot) => ({
      day,
      slot,
      subjectId: null as number | null,
      teacherId: null as string | null,
    })),
  );
};

const extractSlotFromName = (name: string | undefined, maxSlot: number) => {
  if (!name) return null;
  const match = /lesson\s*(\d+)/i.exec(name);
  if (!match) return null;
  const slot = Number(match[1]);
  if (Number.isNaN(slot) || slot < 1 || slot > maxSlot) return null;
  return slot;
};

const getMinutesFromDate = (value?: Date) => {
  if (!value) return null;
  return value.getUTCHours() * 60 + value.getUTCMinutes();
};

const mapLessonsToSlots = (
  classLessons: Array<{
    day: DayValue;
    name: string;
    startTime?: Date;
    subjectId: number;
    teacherId?: string;
  }>,
  slotNumbers: number[],
) => {
  const byDay = new Map<DayValue, typeof classLessons>();

  for (const lesson of classLessons) {
    const dayLessons = byDay.get(lesson.day) ?? [];
    dayLessons.push(lesson);
    byDay.set(lesson.day, dayLessons);
  }

  const mapped: Array<{
    day: DayValue;
    slot: number;
    subjectId: number;
    teacherId?: string;
  }> = [];

  for (const day of lessonDays) {
    const dayLessons = (byDay.get(day) ?? []).sort((a, b) => {
      const minutesA =
        getMinutesFromDate(a.startTime) ?? Number.MAX_SAFE_INTEGER;
      const minutesB =
        getMinutesFromDate(b.startTime) ?? Number.MAX_SAFE_INTEGER;
      return minutesA - minutesB;
    });

    const usedSlots = new Set<number>();
    const maxSlot = slotNumbers[slotNumbers.length - 1] ?? 1;

    for (const lesson of dayLessons) {
      const namedSlot = extractSlotFromName(lesson.name, maxSlot);
      if (!namedSlot || usedSlots.has(namedSlot)) continue;

      usedSlots.add(namedSlot);
      mapped.push({
        day,
        slot: namedSlot,
        subjectId: lesson.subjectId,
        teacherId: lesson.teacherId,
      });
    }

    for (const lesson of dayLessons) {
      const namedSlot = extractSlotFromName(lesson.name, maxSlot);
      if (namedSlot && !usedSlots.has(namedSlot)) continue;
      if (namedSlot && usedSlots.has(namedSlot)) continue;

      const nextFreeSlot = slotNumbers.find((slot) => !usedSlots.has(slot));
      if (!nextFreeSlot) continue;

      usedSlots.add(nextFreeSlot);
      mapped.push({
        day,
        slot: nextFreeSlot,
        subjectId: lesson.subjectId,
        teacherId: lesson.teacherId,
      });
    }
  }

  return mapped;
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
    schoolSettings,
  } = relatedData ?? {};

  const lessonsPerDay = schoolSettings?.lessonsPerDay ?? 6;
  const slotNumbers = useMemo(
    () => buildSlotNumbers(lessonsPerDay),
    [lessonsPerDay],
  );
  const slotsPerDay = slotNumbers.length;

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
      entries: buildInitialEntries(slotNumbers),
    },
  });

  const selectedClassId = useWatch({ control, name: "classId" });
  const entries = useWatch({ control, name: "entries" }) ?? [];

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === Number(selectedClassId)),
    [classes, selectedClassId],
  );

  const selectedClassGrade = useMemo(
    () => selectedClass?.gradeId ?? getGradeFromClassName(selectedClass?.name),
    [selectedClass],
  );

  const filteredSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    if (!selectedClassGrade) return subjects;
    return subjects.filter(
      (subject) =>
        (subject.gradeId ?? getGradeFromSubjectName(subject.name)) ===
        selectedClassGrade,
    );
  }, [selectedClassGrade, selectedClassId, subjects]);

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
        lessonDays.findIndex((day) => day === activeDay) * slotsPerDay +
        (slot - 1);
      return { slot, index };
    });
  }, [activeDay, slotNumbers, slotsPerDay]);

  const applyClassSchedule = useCallback(
    (classIdValue?: number) => {
      const classId = Number(classIdValue);
      if (Number.isNaN(classId) || classId <= 0) {
        setValue("entries", buildInitialEntries(slotNumbers), {
          shouldDirty: true,
          shouldValidate: true,
        });
        return;
      }

      const nextEntries = buildInitialEntries(slotNumbers);

      const classLessons = lessons.filter(
        (lesson) => lesson.classId === classId,
      );
      const slottedLessons = mapLessonsToSlots(classLessons, slotNumbers);

      for (const lesson of slottedLessons) {
        const dayIndex = lessonDays.findIndex((day) => day === lesson.day);
        if (dayIndex < 0) continue;

        const index = dayIndex * slotsPerDay + (lesson.slot - 1);
        if (!nextEntries[index]) continue;

        nextEntries[index] = {
          day: lesson.day,
          slot: lesson.slot,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId ?? null,
        };
      }

      setValue("entries", nextEntries, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [lessons, setValue, slotNumbers, slotsPerDay],
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
    const singleTeacherId =
      allowedTeachers.length === 1 ? allowedTeachers[0].id : null;

    setValue(`entries.${entryIndex}.subjectId`, nextSubjectId, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (singleTeacherId) {
      setValue(`entries.${entryIndex}.teacherId`, singleTeacherId, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

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
          ////////////////////
        if (result.success) {
  if (type === "create") {
    try {
      const schoolId = await getSchoolId();

      const students = await prisma.student.findMany({
        where: {
          classId: Number(formValues.classId),
        },
        select: { id: true },
      });

      for (const student of students) {
        await createNotification({
          schoolId,
          recipientType: "STUDENT",
          recipientId: student.id,
          type: "LESSON",
          title: "Schedule Update",
          message: A new lesson has been added to your schedule: "${formValues.name}",
          relatedId: Number(formValues.classId),
        });
      }
    } catch (error) {
      console.error("Notification error:", error);
    }
  }

  toast(Lesson has been ${type === "create" ? "created" : "updated"}!);
  setOpen(false);
  router.refresh();
  return;
}
              ////////////////////
        toast.error(result.message ?? "Something went wrong!");
      } catch {
        toast.error("Something went wrong!");
      }
    });
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create"
          ? "Create weekly lesson schedule"
          : "Update weekly lesson schedule"}
      </h1>

      <div className="flex flex-col gap-2 w-full">
        <label className="font-medium text-gray-700 text-sm">Class</label>
        <select
          className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
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
          <p className="font-medium text-red-500 text-xs">
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
                  <span className="ml-2 font-medium text-gray-700 text-sm">
                    - {teacherName}
                  </span>
                ) : null}
              </p>
              <div className="gap-2 grid md:grid-cols-2">
                <select
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
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
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
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
      {buildInitialEntries(slotNumbers).map((entry, index) => {
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
        <p className="font-medium text-red-500 text-xs">
          {errors.entries.message.toString()}
        </p>
      )}

      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Weekly Schedule"}
      </button>
    </form>
  );
};

export default LessonForm;
