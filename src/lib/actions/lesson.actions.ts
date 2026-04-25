"use server";

import { LessonSchema, LessonScheduleSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  ensureAdminAccess,
  deleteLessonGraph,
} from "./helpers";

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const saveLessonSchedule = async (
  currentState: CurrentState,
  data: LessonScheduleSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    const selectedEntries = data.entries.filter(
      (entry) => entry.subjectId && entry.subjectId > 0,
    );

    if (selectedEntries.length === 0) {
      return {
        success: false,
        error: true,
        message: "Select at least one subject in the weekly schedule.",
      };
    }

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

    const subjectIds = Array.from(
      new Set(selectedEntries.map((entry) => Number(entry.subjectId))),
    );

    const [selectedClass, subjects] = await Promise.all([
      prisma.class.findUnique({
        where: { id: data.classId },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: {
          id: true,
          name: true,
          teachers: { select: { id: true } },
        },
      }),
    ]);

    if (!selectedClass) {
      return {
        success: false,
        error: true,
        message: "Selected class was not found.",
      };
    }

    const classGrade = getGradeFromClassName(selectedClass.name);

    const subjectTeacherMap = new Map<number, Set<string>>();

    for (const subject of subjects) {
      const subjectGrade = getGradeFromSubjectName(subject.name);
      if (classGrade !== null && subjectGrade !== classGrade) {
        return {
          success: false,
          error: true,
          message:
            "Only subjects from the selected class grade can be scheduled.",
        };
      }

      const allowedTeacherIds = new Set(
        subject.teachers.map((teacher) => teacher.id),
      );

      if (allowedTeacherIds.size === 0) {
        return {
          success: false,
          error: true,
          message:
            "One or more selected subjects do not have an assigned teacher.",
        };
      }

      subjectTeacherMap.set(subject.id, allowedTeacherIds);
    }

    for (const entry of selectedEntries) {
      const subjectId = Number(entry.subjectId);
      const teacherId = entry.teacherId;

      if (!teacherId) {
        return {
          success: false,
          error: true,
          message: "Teacher is required for each selected subject.",
        };
      }

      const allowedTeacherIds = subjectTeacherMap.get(subjectId);
      if (!allowedTeacherIds || !allowedTeacherIds.has(teacherId)) {
        return {
          success: false,
          error: true,
          message:
            "The selected teacher cannot teach one or more of the selected subjects.",
        };
      }
    }

    const slotStartHour = 7;
    const slotDurationMinutes = 45;
    const selectedSlotKeys = new Set(
      selectedEntries.map((entry) => `${entry.day}-${entry.slot}`),
    );

    const plannedLessons = selectedEntries.map((entry) => ({
      day: entry.day,
      slot: entry.slot,
      subjectId: Number(entry.subjectId),
      teacherId: entry.teacherId!,
    }));

    const plannedTeacherIds = Array.from(
      new Set(plannedLessons.map((entry) => entry.teacherId)),
    );
    const plannedDays = Array.from(
      new Set(plannedLessons.map((entry) => entry.day)),
    );

    const teacherExistingLessons = await prisma.lesson.findMany({
      where: {
        teacherId: { in: plannedTeacherIds },
        day: { in: plannedDays },
        classId: { not: data.classId },
      },
      select: {
        teacherId: true,
        day: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const planned of plannedLessons) {
      const plannedStart = new Date();
      plannedStart.setUTCFullYear(2000, 0, 1);
      const startMinutes = (planned.slot - 1) * slotDurationMinutes;
      plannedStart.setUTCHours(slotStartHour, startMinutes, 0, 0);

      const plannedEnd = new Date(plannedStart);
      plannedEnd.setUTCMinutes(
        plannedEnd.getUTCMinutes() + slotDurationMinutes,
      );

      const hasConflict = teacherExistingLessons.some((lesson) => {
        if (
          lesson.teacherId !== planned.teacherId ||
          lesson.day !== planned.day
        ) {
          return false;
        }

        return plannedStart < lesson.endTime && plannedEnd > lesson.startTime;
      });

      if (hasConflict) {
        return {
          success: false,
          error: true,
          message:
            "Teacher conflict detected: one or more teachers already have a lesson at the same time.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      const getSlotFromName = (name?: string) => {
        if (!name) return null;
        const match = /lesson\s*(\d+)/i.exec(name);
        if (!match) return null;

        const slot = Number(match[1]);
        if (Number.isNaN(slot) || slot < 1 || slot > 6) return null;
        return slot;
      };

      const getMinutesFromDate = (value?: Date) => {
        if (!value) return null;
        return value.getUTCHours() * 60 + value.getUTCMinutes();
      };

      const existingLessons = await tx.lesson.findMany({
        where: { classId: data.classId },
        select: { id: true, day: true, name: true, startTime: true },
      });

      const existingLessonBySlot = new Map<string, { id: number }>();

      const lessonsByDay = new Map<
        (typeof existingLessons)[number]["day"],
        typeof existingLessons
      >();

      for (const lesson of existingLessons) {
        const dayLessons = lessonsByDay.get(lesson.day) ?? [];
        dayLessons.push(lesson);
        lessonsByDay.set(lesson.day, dayLessons);
      }

      for (const [, dayLessons] of lessonsByDay) {
        dayLessons.sort((a, b) => {
          const minutesA =
            getMinutesFromDate(a.startTime) ?? Number.MAX_SAFE_INTEGER;
          const minutesB =
            getMinutesFromDate(b.startTime) ?? Number.MAX_SAFE_INTEGER;
          return minutesA - minutesB;
        });

        const usedSlots = new Set<number>();

        for (const lesson of dayLessons) {
          const slot = getSlotFromName(lesson.name);
          if (!slot || usedSlots.has(slot)) continue;

          usedSlots.add(slot);
          const key = `${lesson.day}-${slot}`;
          if (!existingLessonBySlot.has(key)) {
            existingLessonBySlot.set(key, { id: lesson.id });
          }
        }

        for (const lesson of dayLessons) {
          const namedSlot = getSlotFromName(lesson.name);
          if (namedSlot && usedSlots.has(namedSlot)) continue;

          const fallbackSlot = [1, 2, 3, 4, 5, 6].find(
            (slot) => !usedSlots.has(slot),
          );

          if (!fallbackSlot) continue;

          usedSlots.add(fallbackSlot);
          const key = `${lesson.day}-${fallbackSlot}`;
          if (!existingLessonBySlot.has(key)) {
            existingLessonBySlot.set(key, { id: lesson.id });
          }
        }
      }

      const staleLessons = Array.from(existingLessonBySlot.entries())
        .filter(([slotKey]) => !selectedSlotKeys.has(slotKey))
        .map(([, lesson]) => lesson);

      const staleLessonIds = staleLessons.map((lesson) => lesson.id);

      if (staleLessonIds.length > 0) {
        // Delete dependent exams first
        await tx.exam.deleteMany({
          where: { lessonId: { in: staleLessonIds } },
        });

        // Delete dependent assignments
        await tx.assignment.deleteMany({
          where: { lessonId: { in: staleLessonIds } },
        });

        // Finally, delete the stale lessons
        await tx.lesson.deleteMany({
          where: { id: { in: staleLessonIds } },
        });
      }

      for (const entry of selectedEntries) {
        const subjectId = Number(entry.subjectId);
        const teacherId = entry.teacherId!;

        const start = new Date();
        start.setUTCFullYear(2000, 0, 1);
        const startMinutes = (entry.slot - 1) * slotDurationMinutes;
        start.setUTCHours(slotStartHour, startMinutes, 0, 0);

        const end = new Date(start);
        end.setUTCMinutes(end.getUTCMinutes() + slotDurationMinutes);

        const slotKey = `${entry.day}-${entry.slot}`;
        const existingLesson = existingLessonBySlot.get(slotKey);

        if (existingLesson) {
          await tx.lesson.update({
            where: { id: existingLesson.id },
            data: {
              name: `Lesson ${entry.slot}`,
              day: entry.day,
              startTime: start,
              endTime: end,
              classId: data.classId,
              subjectId,
              teacherId,
            },
          });
        } else {
          await tx.lesson.create({
            data: {
              name: `Lesson ${entry.slot}`,
              day: entry.day,
              startTime: start,
              endTime: end,
              classId: data.classId,
              subjectId,
              teacherId,
            },
          });
        }
      }
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Lesson id is required." };
  }

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return successResult(["/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid lesson id." };

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.$transaction(async (tx) => {
      await deleteLessonGraph(tx, [id]);
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
