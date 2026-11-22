// Checks what the browser sends to the import actions. Nothing from the
// browser is trusted: every field is listed, and lengths are capped.

import { z } from "zod";

import { fieldsFor, type PersonField } from "./columns";
import { MAX_IMPORT_ROWS } from "./fileCheck";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";
import { MAX_SUBJECTS_PER_ROW } from "./subjects";

const allFields = [...new Set([...fieldsFor("students"), ...fieldsFor("teachers")])] as [PersonField, ...PersonField[]];

const cellValue = z.string().max(200);

export const importRowSchema = z
  .object({
    sourceRow: z.number().int().min(1).max(100_000),
    values: z.record(z.enum(allFields), cellValue),
    unclear: z.array(z.enum(allFields)).max(allFields.length).optional(),
    decision: z
      .object({
        skip: z.boolean().optional(),
        classId: z.number().int().positive().optional(),
        sameAs: z.string().min(1).max(64).optional(),
        asNew: z.boolean().optional(),
        subjectChoices: z
          .record(z.string().min(1).max(200), z.number().int().positive().nullable())
          .refine((choices) => Object.keys(choices).length <= MAX_SUBJECTS_PER_ROW)
          .optional(),
        rejectedChanges: z.array(z.enum(allFields)).max(allFields.length).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const saveBatchSchema = z.array(importRowSchema).min(1).max(SAVE_BATCH_SIZE);

/** The whole file, for the review screen. */
export const reviewSchema = z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS);
