"use server";

import { z } from "zod";
import { DEFAULT_GRADE_COMPONENTS, hasValidGradeComponentWeights } from "@/lib/gradeComponents";
import { semesterAndAnnualWhere } from "@/lib/academicYears";
import prisma from "@/lib/prisma";
import {
  getRequiredAcademicSemester,
  requireActionAccess,
  successResult,
  errorResult,
  type CurrentState,
} from "./helpers";

const gradeSchemeSchema = z.object({
  teacherId: z.string().min(1),
  classId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
  components: z
    .array(
      z.object({
        key: z.string().nullable(),
        name: z.string().trim().min(1).max(60),
        weight: z.coerce.number().positive().max(100),
      }),
    )
    .min(1),
});

export const saveGradeScheme = async (
  _currentState: CurrentState,
  input: z.input<typeof gradeSchemeSchema>,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = gradeSchemeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: parsed.error.issues[0]?.message ?? "Invalid grading scheme.",
    };
  }

  const data = parsed.data;
  const teacherId = access.role === "teacher" ? access.userId : data.teacherId;
  const normalizedComponents = data.components.map((component) => {
    const defaultComponent = DEFAULT_GRADE_COMPONENTS.find(
      (item) => item.key === component.key,
    );
    return {
      key: defaultComponent?.key ?? null,
      name: defaultComponent?.name ?? component.name.trim(),
      weight: component.weight,
    };
  });

  if (
    normalizedComponents.some(
      (component) => component.key === null && component.name.length > 60,
    ) ||
    normalizedComponents.some((component, index) =>
      normalizedComponents
        .slice(0, index)
        .some(
          (previous) =>
            previous.key === component.key &&
            (component.key !== null ||
              previous.name.toLocaleLowerCase() ===
                component.name.toLocaleLowerCase()),
        ),
    )
  ) {
    return {
      success: false,
      error: true,
      message: "Choose each grade component only once.",
    };
  }

  if (!hasValidGradeComponentWeights(normalizedComponents)) {
    return {
      success: false,
      error: true,
      message: "Grade component weights must add up to 100%.",
    };
  }

  try {
    const { academicYearId, semester } = await getRequiredAcademicSemester(
      access.schoolId,
    );
    const assignedLesson = await prisma.lesson.findFirst({
      where: {
        schoolId: access.schoolId,
        academicYearId,
        ...semesterAndAnnualWhere(semester),
        teacherId,
        classId: data.classId,
        subjectId: data.subjectId,
      },
      select: { id: true },
    });

    if (!assignedLesson) {
      return {
        success: false,
        error: true,
        message: "This teacher is not assigned to the selected class and subject.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const scheme = await tx.gradeScheme.upsert({
        where: {
          schoolId_teacherId_classId_subjectId_academicYearId_semester: {
            schoolId: access.schoolId,
            teacherId,
            classId: data.classId,
            subjectId: data.subjectId,
            academicYearId,
            semester,
          },
        },
        create: {
          schoolId: access.schoolId,
          teacherId,
          classId: data.classId,
          subjectId: data.subjectId,
          academicYearId,
          semester,
        },
        update: {},
        select: { id: true },
      });

      const catalogComponents = [];
      for (const component of normalizedComponents) {
        if (component.key) {
          const defaultComponent = await tx.gradeComponent.upsert({
            where: {
              schoolId_key: {
                schoolId: access.schoolId,
                key: component.key,
              },
            },
            create: {
              schoolId: access.schoolId,
              key: component.key,
              name: component.name,
              isDefault: true,
            },
            update: { name: component.name, isDefault: true },
            select: { id: true },
          });
          catalogComponents.push({ ...component, id: defaultComponent.id });
          continue;
        }

        const existingCustom = await tx.gradeComponent.findFirst({
          where: {
            schoolId: access.schoolId,
            name: { equals: component.name, mode: "insensitive" },
          },
          select: { id: true, key: true },
        });
        if (existingCustom?.key) {
          throw new Error("A custom component cannot use a reserved component name.");
        }
        const customComponent =
          existingCustom ??
          (await tx.gradeComponent.create({
            data: {
              schoolId: access.schoolId,
              name: component.name,
              isDefault: false,
            },
            select: { id: true, key: true },
          }));
        catalogComponents.push({ ...component, id: customComponent.id });
      }

      const existingSchemeComponents =
        await tx.gradeSchemeComponent.findMany({
          where: { schemeId: scheme.id },
          select: { id: true, componentId: true },
        });
      const selectedCatalogIds = new Set(
        catalogComponents.map((component) => component.id),
      );
      const removed = existingSchemeComponents.filter(
        (component) => !selectedCatalogIds.has(component.componentId),
      );

      if (removed.length > 0) {
        const removedIds = removed.map((component) => component.id);
        const [examCount, assignmentCount] = await Promise.all([
          tx.exam.count({
            where: { gradeSchemeComponentId: { in: removedIds } },
          }),
          tx.assignment.count({
            where: { gradeSchemeComponentId: { in: removedIds } },
          }),
        ]);
        if (examCount + assignmentCount > 0) {
          throw new Error(
            "A grade component already used by an assessment cannot be removed.",
          );
        }
        await tx.gradeSchemeComponent.deleteMany({
          where: { id: { in: removedIds } },
        });
      }

      for (const component of catalogComponents) {
        await tx.gradeSchemeComponent.upsert({
          where: {
            schemeId_componentId: {
              schemeId: scheme.id,
              componentId: component.id,
            },
          },
          create: {
            schemeId: scheme.id,
            componentId: component.id,
            weight: component.weight,
          },
          update: { weight: component.weight },
        });
      }
    });

    return successResult([
      "/list/grade-components",
      "/list/results",
      "/list/final-results",
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("cannot be removed") ||
        error.message.includes("reserved component"))
    ) {
      return { success: false, error: true, message: error.message };
    }
    return errorResult(error);
  }
};
