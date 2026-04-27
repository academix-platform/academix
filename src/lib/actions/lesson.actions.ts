"use server";

import { revalidatePath } from "next/cache";

import { ensureAdminAccess, errorResult, successResult } from "./helpers";
import prisma from "../prisma";
import { LessonScheduleSchema } from "../formValidationSchemas";
import type { CurrentState } from "./helpers";
import {
  getDefaultSchoolScheduleSettings,
  getSchoolScheduleSettings,
  type SchoolScheduleSettings,
} from "../schoolSettings";

type SelectedScheduleEntry = {
  day: LessonScheduleSchema["entries"][number]["day"];
  slot: number;
  subjectId: number;
  teacherId: string;
};

const scheduleKey = (
  day: LessonScheduleSchema["entries"][number]["day"],
  slot: number,
) => `${day}-${slot}`;

const toSelectedEntries = (entries: LessonScheduleSchema["entries"]) =>
  entries
    .filter((entry) => Number(entry.subjectId) > 0 && !!entry.teacherId)
    .map((entry) => ({
      day: entry.day,
      slot: Number(entry.slot),
      subjectId: Number(entry.subjectId),
      teacherId: String(entry.teacherId),
    }));

const extractSlotFromLessonName = (name: string, lessonsPerDay: number) => {
  const match = /lesson\s*(\d+)/i.exec(name);
  if (!match) return null;

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > lessonsPerDay) return null;

  return parsed;
};

const extractSlotFromStartTime = (
  startTime: Date,
  settings: SchoolScheduleSettings,
) => {
  const totalMinutes = startTime.getUTCHours() * 60 + startTime.getUTCMinutes();
  const slotBaseMinutes =
    settings.workDayStartHour * 60 + settings.workDayStartMinute;
  const offset = totalMinutes - slotBaseMinutes;
  if (offset < 0) return null;

  const slot = Math.floor(offset / settings.lessonDurationMinutes) + 1;
  if (slot < 1 || slot > settings.lessonsPerDay) return null;

  const alignedMinutes =
    slotBaseMinutes + (slot - 1) * settings.lessonDurationMinutes;
  if (alignedMinutes !== totalMinutes) return null;

  return slot;
};

const slotToDateRange = (slot: number, settings: SchoolScheduleSettings) => {
  const baseMinutes =
    settings.workDayStartHour * 60 + settings.workDayStartMinute;
  const slotStartMinutes =
    baseMinutes + (slot - 1) * settings.lessonDurationMinutes;
  const startHour = Math.floor(slotStartMinutes / 60);
  const startMinute = slotStartMinutes % 60;

  const start = new Date(Date.UTC(2000, 0, 1, startHour, startMinute, 0, 0));

  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + settings.lessonDurationMinutes);

  return { start, end };
};

const detectTeacherConflicts = async ({
  classId,
  selectedEntries,
  settings,
}: {
  classId: number;
  selectedEntries: SelectedScheduleEntry[];
  settings: SchoolScheduleSettings;
}) => {
  if (selectedEntries.length === 0) return null;

  const seenInPayload = new Set<string>();
  for (const entry of selectedEntries) {
    const key = `${entry.teacherId}-${entry.day}-${entry.slot}`;
    if (seenInPayload.has(key)) {
      return {
        message: `Teacher conflict detected in schedule payload for ${entry.day} lesson ${entry.slot}.`,
      };
    }
    seenInPayload.add(key);
  }

  const teacherIds = Array.from(
    new Set(selectedEntries.map((entry) => entry.teacherId)),
  );
  const days = Array.from(new Set(selectedEntries.map((entry) => entry.day)));

  const existingLessons = await prisma.lesson.findMany({
    where: {
      classId: { not: classId },
      teacherId: { in: teacherIds },
      day: { in: days },
    },
    select: {
      day: true,
      name: true,
      startTime: true,
      teacherId: true,
      teacher: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  for (const entry of selectedEntries) {
    const conflict = existingLessons.find((lesson) => {
      if (lesson.teacherId !== entry.teacherId || lesson.day !== entry.day) {
        return false;
      }

      const lessonSlot =
        extractSlotFromLessonName(lesson.name, settings.lessonsPerDay) ??
        extractSlotFromStartTime(lesson.startTime, settings);

      return lessonSlot === entry.slot;
    });

    if (conflict) {
      const teacherLabel = conflict.teacher?.name ?? "Selected teacher";
      const classLabel = conflict.class?.name ?? "another class";

      return {
        message: `${teacherLabel} already assigned at lesson ${entry.slot} in class ${classLabel} on ${entry.day}`,
      };
    }
  }

  return null;
};

export const saveLessonSchedule = async (
  currentState: CurrentState,
  data: LessonScheduleSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    const settings =
      (await getSchoolScheduleSettings()) ?? getDefaultSchoolScheduleSettings();
    const selectedEntries = toSelectedEntries(data.entries);

    const hasInvalidSlot = selectedEntries.some(
      (entry) => entry.slot < 1 || entry.slot > settings.lessonsPerDay,
    );

    if (hasInvalidSlot) {
      return {
        success: false,
        error: true,
        message: `Lesson slots must be between 1 and ${settings.lessonsPerDay}.`,
      };
    }

    if (selectedEntries.length === 0) {
      return {
        success: false,
        error: true,
        message: "Select at least one subject in the weekly schedule.",
      };
    }

    const conflict = await detectTeacherConflicts({
      classId: data.classId,
      selectedEntries,
      settings,
    });

    if (conflict) {
      return {
        success: false,
        error: true,
        message: conflict.message,
      };
    }

    await prisma.$transaction(async (tx) => {
      const existingLessons = await tx.lesson.findMany({
        where: { classId: data.classId },
        select: {
          id: true,
          day: true,
          name: true,
          startTime: true,
          subjectId: true,
          teacherId: true,
        },
      });

      const selectedByKey = new Map(
        selectedEntries.map((entry) => [
          scheduleKey(entry.day, entry.slot),
          entry,
        ]),
      );

      const existingByKey = new Map<
        string,
        {
          id: number;
          subjectId: number;
          teacherId: string;
        }
      >();

      for (const lesson of existingLessons) {
        const slot =
          extractSlotFromLessonName(lesson.name, settings.lessonsPerDay) ??
          extractSlotFromStartTime(lesson.startTime, settings);
        if (!slot) continue;

        existingByKey.set(scheduleKey(lesson.day, slot), {
          id: lesson.id,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
        });
      }

      const lessonIdsToDelete: number[] = [];
      for (const [key, lesson] of existingByKey) {
        if (!selectedByKey.has(key)) {
          lessonIdsToDelete.push(lesson.id);
        }
      }

      if (lessonIdsToDelete.length > 0) {
        await tx.exam.deleteMany({
          where: { lessonId: { in: lessonIdsToDelete } },
        });
        await tx.assignment.deleteMany({
          where: { lessonId: { in: lessonIdsToDelete } },
        });
        await tx.lesson.deleteMany({
          where: { id: { in: lessonIdsToDelete } },
        });
      }

      for (const entry of selectedEntries) {
        const key = scheduleKey(entry.day, entry.slot);
        const existing = existingByKey.get(key);

        if (!existing) {
          const { start, end } = slotToDateRange(entry.slot, settings);

          await tx.lesson.create({
            data: {
              name: `Lesson ${entry.slot}`,
              day: entry.day,
              startTime: start,
              endTime: end,
              classId: data.classId,
              subjectId: entry.subjectId,
              teacherId: entry.teacherId,
            },
          });

          continue;
        }

        const hasChanged =
          existing.subjectId !== entry.subjectId ||
          existing.teacherId !== entry.teacherId;

        if (!hasChanged) continue;

        await tx.lesson.update({
          where: { id: existing.id },
          data: {
            name: `Lesson ${entry.slot}`,
            day: entry.day,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
          },
        });
      }
    });

    revalidatePath("/list/lessons");
    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};
