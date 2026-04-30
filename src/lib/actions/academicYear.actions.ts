"use server";

import {
  academicYearSchema,
  type AcademicYearSchema,
} from "../formValidationSchemas";
import prisma from "../prisma";
import { errorResult, requireActionAccess, successResult } from "./helpers";
import type { CurrentState } from "./helpers";

const toUtcDate = (value: Date) =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const getAcademicYearDelegate = () =>
  (
    prisma as unknown as {
      academicYear?: {
        create: (args: {
          data: {
            name: string;
            startDate: Date;
            endDate: Date;
            isCurrent: boolean;
            schoolId: number;
          };
        }) => Promise<unknown>;
        update: (args: {
          where: { id: number };
          data: {
            name: string;
            startDate: Date;
            endDate: Date;
            isCurrent: boolean;
            schoolId?: number;
          };
        }) => Promise<unknown>;
        updateMany: (args: {
          data: { isCurrent: boolean };
          where?: { id?: { not: number }; schoolId?: number };
        }) => Promise<unknown>;
      };
    }
  ).academicYear;

export const createAcademicYear = async (
  currentState: CurrentState,
  data: AcademicYearSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const parsed = academicYearSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message:
          parsed.error.issues[0]?.message ?? "Invalid academic year payload.",
      };
    }

    const delegate = getAcademicYearDelegate();
    if (!delegate?.create || !delegate?.updateMany) {
      return {
        success: false,
        error: true,
        message:
          "Academic year model is not available yet. Restart the dev server after running Prisma generate/migrations.",
      };
    }

    const normalizedStartDate = toUtcDate(parsed.data.startDate);
    const normalizedEndDate = toUtcDate(parsed.data.endDate);

    if (parsed.data.isCurrent) {
      await delegate.updateMany({
        where: { schoolId: access.schoolId },
        data: { isCurrent: false },
      });
    }

    await delegate.create({
      data: {
        name: parsed.data.name.trim(),
        schoolId: access.schoolId,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        isCurrent: parsed.data.isCurrent,
      },
    });

    return successResult(["/settings"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAcademicYear = async (
  currentState: CurrentState,
  data: AcademicYearSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const parsed = academicYearSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message:
          parsed.error.issues[0]?.message ?? "Invalid academic year payload.",
      };
    }

    if (!parsed.data.id) {
      return {
        success: false,
        error: true,
        message: "Academic year id is required for update.",
      };
    }

    const delegate = getAcademicYearDelegate();
    if (!delegate?.update || !delegate?.updateMany) {
      return {
        success: false,
        error: true,
        message:
          "Academic year model is not available yet. Restart the dev server after running Prisma generate/migrations.",
      };
    }

    const normalizedStartDate = toUtcDate(parsed.data.startDate);
    const normalizedEndDate = toUtcDate(parsed.data.endDate);

    if (parsed.data.isCurrent) {
      await delegate.updateMany({
        where: { id: { not: parsed.data.id }, schoolId: access.schoolId },
        data: { isCurrent: false },
      });
    }

    await delegate.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name.trim(),
        schoolId: access.schoolId,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        isCurrent: parsed.data.isCurrent,
      },
    });

    return successResult(["/settings"]);
  } catch (err) {
    return errorResult(err);
  }
};
