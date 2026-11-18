import "server-only";
import type { PrismaClient } from "@prisma/client";

import { changeTeacherWith, createTeacherWith, type TeacherChanges } from "@/lib/people/teachers";

import {
  AccountError,
  ROWS_AT_ONCE,
  emailLogins,
  politeClerk,
  runLimited,
  stopReasonOf,
  stopSignal,
  type BatchClerk,
  type Login,
  type SendEmail,
} from "./batchTools";
import type { TeacherField } from "./columns";
import { generatePassword, pickFreeUsernames } from "./logins";
import type { ExistingTeacher } from "./matching";
import type { SaveBatchResult, SaveReason, SaveRowInput, SaveRowResult } from "./saveBatch";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";
import { isBlockingTeacherFlag, reviewTeacherRows, type ReviewedTeacherRow, type TeacherContext } from "./teacherFlags";

// Saving one batch of reviewed teacher rows, the same way student rows are
// saved: every check is repeated here against the database, and a few rows
// are saved at the same time, each on its own. A problem with one row never
// stops the others; a problem no row can get past stops the batch, keeping
// the rows saved so far. Passwords are returned once and never stored or logged.

export type TeacherSaveDb = Pick<PrismaClient, "teacher" | "subject" | "class">;

export type TeacherSaveDeps = {
  db: TeacherSaveDb;
  clerk: BatchClerk;
  wait?: (ms: number) => Promise<void>;
  /** Sends the account email. Without it, nobody is emailed and every login is listed. */
  sendEmail?: SendEmail;
};

/** The school's teachers that import rows are checked against. */
export const loadTeacherContext = async (db: TeacherSaveDb, schoolId: number): Promise<TeacherContext> => {
  const [teachers, subjects, classes] = await Promise.all([
    db.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        sex: true,
        birthday: true,
        bloodType: true,
        address: true,
        subjects: { select: { id: true } },
      },
    }),
    db.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true, gradeId: true, grade: { select: { level: true } } },
    }),
    db.class.findMany({ where: { schoolId }, select: { gradeId: true } }),
  ]);
  return {
    subjects: subjects.map(({ grade, ...subject }) => ({ ...subject, level: grade.level })),
    gradesWithClasses: [...new Set(classes.map((classItem) => classItem.gradeId))],
    teachers: teachers.map(
      ({ subjects, ...teacher }): ExistingTeacher => ({ ...teacher, subjectIds: subjects.map((subject) => subject.id) }),
    ),
  };
};

const isUniqueClash = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";

/** Saves one batch of teacher rows for the admin's school, each row on its own. */
export const saveTeacherBatchWith = async (
  deps: TeacherSaveDeps,
  schoolId: number,
  rows: SaveRowInput[],
): Promise<SaveBatchResult> => {
  if (rows.length > SAVE_BATCH_SIZE) throw new Error(`A batch holds at most ${SAVE_BATCH_SIZE} rows.`);

  const { db } = deps;
  const signal = stopSignal();
  const clerk = politeClerk(deps.clerk, deps.wait);
  const context = await loadTeacherContext(db, schoolId);
  const decisions = Object.fromEntries(rows.map((row) => [row.sourceRow, row.decision ?? {}]));
  const reviewed = reviewTeacherRows(rows, context, decisions);

  // Usernames for everyone this batch may create, checked against Clerk together.
  let usernames: string[] = [];
  try {
    usernames = await pickFreeUsernames(clerk, "teacher", reviewed.filter((row) => row.canSave && row.status === "new").length);
  } catch (err) {
    // Clerk can't be asked, so no new teacher can be made in this batch.
    signal.stop(stopReasonOf(err) ?? "accountService");
  }

  const failed = (row: ReviewedTeacherRow, reason: SaveReason): SaveRowResult => ({
    sourceRow: row.sourceRow,
    outcome: "failed",
    reasons: [reason],
    logins: [],
  });

  const createRow = async (row: ReviewedTeacherRow): Promise<SaveRowResult> => {
    const { teacher } = row;
    const username = usernames.shift();
    if (!username) return failed(row, "usernameUnavailable");
    if (!teacher.name || !teacher.sex) return failed(row, "requiredMissing");

    const password = generatePassword();
    const created = await createTeacherWith(
      { db, clerk },
      schoolId,
      {
        username,
        password,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        sex: teacher.sex,
        birthday: teacher.birthday,
        bloodType: teacher.bloodType,
        address: teacher.address,
        subjectIds: row.subjects.map((subject) => subject.id),
      },
      { allowNoSubjects: true },
    );
    if (!created.ok) return failed(row, created.problem);

    const login: Login = { role: "teacher", name: teacher.name, username, password, email: teacher.email, emailed: false };
    return { sourceRow: row.sourceRow, outcome: "created", reasons: [], logins: [login] };
  };

  const updateRow = async (row: ReviewedTeacherRow): Promise<SaveRowResult> => {
    if (!row.existingId) return failed(row, "teacherNotFound");
    const { teacher } = row;
    const accepted = (field: TeacherField) => row.changes.some((change) => change.field === field && change.accepted);

    // Only the changes the admin accepted. A field left empty was never a change.
    const fields: NonNullable<TeacherChanges["fields"]> = {};
    if (accepted("teacherName")) fields.name = teacher.name;
    if (accepted("email")) fields.email = teacher.email;
    if (accepted("phone")) fields.phone = teacher.phone;
    if (accepted("sex")) fields.sex = teacher.sex;
    if (accepted("birthday")) fields.birthday = teacher.birthday;
    if (accepted("bloodType")) fields.bloodType = teacher.bloodType;
    if (accepted("address")) fields.address = teacher.address;

    // Subjects from the file are added. None the teacher has are removed.
    const addSubjectIds = row.subjects.filter((subject) => subject.isNew).map((subject) => subject.id);

    const changed = await changeTeacherWith({ db, clerk }, schoolId, row.existingId, { fields, addSubjectIds });
    return changed.ok ? { sourceRow: row.sourceRow, outcome: "updated", reasons: [], logins: [] } : failed(row, changed.problem);
  };

  /** Saves one row. Undefined when a problem that stops the batch kept it from saving. */
  const saveRow = async (row: ReviewedTeacherRow): Promise<SaveRowResult | undefined> => {
    try {
      return row.status === "new" ? await createRow(row) : await updateRow(row);
    } catch (err) {
      // An email or phone taken since the review, such as by another import running now.
      if (isUniqueClash(err)) return failed(row, "contactTaken");
      const stop = stopReasonOf(err);
      if (stop) {
        signal.stop(stop);
        return undefined;
      }
      return failed(row, err instanceof AccountError ? "accountFailed" : "saveFailed");
    }
  };

  const results: (SaveRowResult | undefined)[] = new Array(reviewed.length);
  const toSave: number[] = [];
  reviewed.forEach((row, index) => {
    if (row.status === "skipped") {
      results[index] = { sourceRow: row.sourceRow, outcome: "skipped", reasons: [], logins: [] };
    } else if (!row.canSave) {
      const reasons = [...new Set(row.flags.filter(isBlockingTeacherFlag).map((flag) => flag.kind))];
      results[index] = { sourceRow: row.sourceRow, outcome: "failed", reasons, logins: [] };
    } else if (row.status === "noChanges") {
      results[index] = { sourceRow: row.sourceRow, outcome: "unchanged", reasons: [], logins: [] };
    } else {
      toSave.push(index);
    }
  });

  // Rows repeating an email or phone were flagged above, so every row left is
  // a different teacher and they can be saved side by side.
  await runLimited(
    toSave.map((index) => async () => {
      // After a stop no new row starts. Rows already running finish.
      if (signal.reason) return;
      results[index] = await saveRow(reviewed[index]);
    }),
    ROWS_AT_ONCE,
  );

  const saved = results.filter((result): result is SaveRowResult => result !== undefined);
  // Emails go out once everyone is saved, a few at a time.
  await emailLogins(saved.flatMap((result) => result.logins), deps.sendEmail);

  return { results: saved, ...(signal.reason && { stopped: signal.reason }) };
};
