import type { PrismaClient } from "@prisma/client";

import { readNationalId, type NationalIdProblem } from "@/lib/peopleImport/nationalId";

export type StudentIdDb = Pick<PrismaClient, "student">;

export type StudentNationalIdProblem = NationalIdProblem | "nationalIdTaken";

/**
 * Checks a student's national ID on the server: required, valid, and not used
 * by another student in the same school. Returns the ID as 9 digits.
 */
export const checkStudentNationalId = async (
  db: StudentIdDb,
  {
    schoolId,
    nationalId,
    studentId,
  }: { schoolId: number; nationalId?: string | null; studentId?: string },
): Promise<{ ok: true; id: string } | { ok: false; problem: StudentNationalIdProblem }> => {
  const read = readNationalId(nationalId);
  if (!read.ok) return read;

  const taken = await db.student.findFirst({
    where: { schoolId, nationalId: read.id, ...(studentId && { NOT: { id: studentId } }) },
    select: { id: true },
  });
  return taken ? { ok: false, problem: "nationalIdTaken" } : read;
};

/** Server messages for the problems, in English as the other action messages are. */
export const STUDENT_NATIONAL_ID_MESSAGES: Record<StudentNationalIdProblem, string> = {
  nationalIdRequired: "The national ID is required.",
  nationalIdFormat: "The national ID must be up to 9 digits.",
  nationalIdCheckDigit: "The national ID is not valid. Check its digits.",
  nationalIdTaken: "Another student in this school has this national ID.",
};
