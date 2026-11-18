import "server-only";
import type { PrismaClient } from "@prisma/client";

import { updateAccount, type ClerkUsers } from "@/lib/people/accounts";
import { createParentWith } from "@/lib/people/parents";
import { createStudentWith } from "@/lib/people/students";

import { AccountError, ROWS_AT_ONCE, emailLogins, politeClerk, runLimited, type Login, type SendEmail } from "./batchTools";
import type { PersonField, StudentField } from "./columns";
import { generatePassword, pickFreeUsernames, type UsernameLookup } from "./logins";
import type { ExistingParent, ExistingStudent, SchoolClass } from "./matching";
import { isBlocking, reviewStudentRows, type ReviewedStudentRow, type RowDecision, type StudentContext } from "./rowFlags";
import { SAVE_BATCH_SIZE } from "./saveBatchSize";
import type { TeacherRowFlag } from "./teacherFlags";

// Saving one batch of reviewed import rows. Every check is repeated here
// against the database, each row is saved on its own, and a failed row never
// stops the others. Passwords are returned once and never stored or logged.
//
// A few rows are saved at the same time, since each one mostly waits on Clerk
// and the database. Rows that share a new parent are saved one after another,
// so the parent is made once, and class seats are counted before any row starts.

export { SAVE_BATCH_SIZE };
export type { Login };

export type SaveDb = Pick<PrismaClient, "student" | "class" | "parent" | "studentAcademicYear" | "$transaction">;

export type SaveDeps = {
  db: SaveDb;
  clerk: ClerkUsers & UsernameLookup;
  academicYearId: (schoolId: number) => Promise<number>;
  wait?: (ms: number) => Promise<void>;
  /** Sends the account email. Without it, nobody is emailed and every login is listed. */
  sendEmail?: SendEmail;
};

export type SaveRowInput = {
  sourceRow: number;
  values: Partial<Record<PersonField, string>>;
  unclear?: PersonField[];
  decision?: RowDecision;
};

export type SaveReason =
  | ReviewedStudentRow["flags"][number]["kind"]
  | TeacherRowFlag["kind"]
  | "teacherNotFound"
  | "noSubjects"
  | "subjectNotFound"
  | "noClasses"
  | "classFull"
  | "classNotFound"
  | "parentNotFound"
  | "nationalIdTaken"
  | "nationalIdRequired"
  | "nationalIdFormat"
  | "nationalIdCheckDigit"
  | "studentNotFound"
  | "usernameUnavailable"
  | "accountFailed"
  | "saveFailed"
  | "parentFailed";

export type SaveRowResult = {
  sourceRow: number;
  outcome: "created" | "updated" | "unchanged" | "skipped" | "failed";
  reasons: SaveReason[];
  /** New logins from this row, for the admin to hand out. Shown once, never stored. */
  logins: Login[];
};

type SaveContext = Omit<StudentContext, "students" | "parents"> & {
  students: (ExistingStudent & { username: string })[];
  parents: (ExistingParent & { username: string })[];
};

/** The school's classes, students and parents that import rows are checked against. */
export const loadStudentContext = async (db: Pick<SaveDb, "class" | "student" | "parent">, schoolId: number): Promise<SaveContext> => {
  const [classes, students, parents] = await Promise.all([
    db.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, gradeId: true, capacity: true, _count: { select: { students: true } } },
    }),
    db.student.findMany({
      where: { schoolId },
      select: {
        id: true,
        username: true,
        name: true,
        nationalId: true,
        classId: true,
        sex: true,
        birthday: true,
        bloodType: true,
        address: true,
        phone: true,
        email: true,
        parentId: true,
      },
    }),
    db.parent.findMany({
      where: { schoolId },
      select: { id: true, username: true, name: true, phone: true, email: true, address: true },
    }),
  ]);
  return {
    classes: classes.map(({ _count, ...classItem }): SchoolClass => ({ ...classItem, studentCount: _count.students })),
    students,
    parents,
  };
};

const reasonsOf = (row: ReviewedStudentRow): SaveReason[] => [
  ...new Set(row.flags.filter(isBlocking).map((flag) => flag.kind)),
];

const accepted = (row: ReviewedStudentRow, field: StudentField) =>
  row.changes.some((change) => change.field === field && change.accepted);

/** Saves one batch of student rows for the admin's school, each row on its own. */
export const saveStudentBatchWith = async (
  deps: SaveDeps,
  schoolId: number,
  rows: SaveRowInput[],
): Promise<{ results: SaveRowResult[] }> => {
  if (rows.length > SAVE_BATCH_SIZE) throw new Error(`A batch holds at most ${SAVE_BATCH_SIZE} rows.`);

  const { db, academicYearId } = deps;
  const clerk = politeClerk(deps.clerk, deps.wait);
  const context = await loadStudentContext(db, schoolId);
  const decisions = Object.fromEntries(rows.map((row) => [row.sourceRow, row.decision ?? {}]));
  const reviewed = reviewStudentRows(rows, context, decisions);

  // Usernames for everyone this batch may create, checked against Clerk together.
  const newStudents = reviewed.filter((row) => row.canSave && row.status === "new").length;
  const newParentPhones = new Set(
    reviewed.flatMap((row) => (row.canSave && row.parent.status === "new" ? [row.parent.phone] : [])),
  );
  let studentNames: string[] = [];
  let parentNames: string[] = [];
  let namesFailed = false;
  try {
    studentNames = await pickFreeUsernames(clerk, "student", newStudents);
    parentNames = await pickFreeUsernames(clerk, "parent", newParentPhones.size);
  } catch {
    namesFailed = true;
  }

  /** Parents created by earlier rows of this batch, by phone. */
  const createdParents = new Map<string, string>();

  const saveParent = async (row: ReviewedStudentRow, studentId: string, logins: Login[]) => {
    if (row.parent.status !== "new" || createdParents.has(row.parent.phone)) return true;
    const username = parentNames.shift();
    if (!username) return false;
    const password = generatePassword();
    try {
      const created = await createParentWith({ db, clerk }, schoolId, {
        username,
        password,
        name: row.parent.name,
        phone: row.parent.phone,
        email: row.parent.email,
        studentIds: [studentId],
      });
      if (!created.ok) return false;
      createdParents.set(row.parent.phone, created.id);
      logins.push({ role: "parent", name: row.parent.name, username, password, email: row.parent.email, emailed: false });
      return true;
    } catch {
      return false;
    }
  };

  const knownParentId = (row: ReviewedStudentRow) =>
    row.parent.status === "existing"
      ? row.parent.id
      : row.parent.status === "new"
        ? createdParents.get(row.parent.phone)
        : undefined;

  const createRow = async (row: ReviewedStudentRow): Promise<SaveRowResult> => {
    const { student } = row;
    const classItem = context.classes.find((c) => c.id === student.classId);
    const username = studentNames.shift();
    if (namesFailed || !username) return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["usernameUnavailable"], logins: [] };
    if (!classItem || !student.name || !student.sex) {
      return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["requiredMissing"], logins: [] };
    }

    const password = generatePassword();
    const created = await createStudentWith({ db, clerk, academicYearId }, schoolId, {
      username,
      password,
      name: student.name,
      nationalId: student.nationalId,
      sex: student.sex,
      birthday: student.birthday,
      bloodType: student.bloodType,
      address: student.address,
      phone: student.phone,
      email: student.email,
      gradeId: classItem.gradeId,
      classId: classItem.id,
      parentId: knownParentId(row),
    });
    if (!created.ok) return { sourceRow: row.sourceRow, outcome: "failed", reasons: [created.problem], logins: [] };

    const logins: Login[] = [
      { role: "student", name: student.name, username, password, email: student.email, emailed: false },
    ];
    const parentSaved = await saveParent(row, created.id, logins);
    return parentSaved
      ? { sourceRow: row.sourceRow, outcome: "created", reasons: [], logins }
      : { sourceRow: row.sourceRow, outcome: "failed", reasons: ["parentFailed"], logins };
  };

  const updateRow = async (row: ReviewedStudentRow): Promise<SaveRowResult> => {
    const existing = context.students.find((s) => s.id === row.existingId);
    if (!existing) return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["studentNotFound"], logins: [] };
    const { student } = row;

    // Only the changes the admin accepted. A field left empty was never a change.
    const data: Record<string, unknown> = {};
    if (accepted(row, "studentName")) data.name = student.name;
    if (accepted(row, "nationalId")) data.nationalId = student.nationalId;
    if (accepted(row, "sex")) data.sex = student.sex;
    if (accepted(row, "birthday")) data.birthday = student.birthday;
    if (accepted(row, "bloodType")) data.bloodType = student.bloodType;
    if (accepted(row, "address")) data.address = student.address;
    if (accepted(row, "studentPhone")) data.phone = student.phone;
    if (accepted(row, "studentEmail")) data.email = student.email;
    if (accepted(row, "className")) {
      const classItem = context.classes.find((c) => c.id === student.classId);
      if (!classItem) return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["classNotFound"], logins: [] };
      const inClass = await db.student.count({ where: { schoolId, classId: classItem.id } });
      if (inClass >= classItem.capacity) return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["classFull"], logins: [] };
      data.classId = classItem.id;
      data.gradeId = classItem.gradeId;
    }
    const linkParent = accepted(row, "parentPhone");
    const parentId = linkParent ? knownParentId(row) : undefined;
    if (parentId) data.parentId = parentId;

    if (data.name) {
      await updateAccount(clerk, existing.id, { username: existing.username, name: student.name!, role: "student" });
    }
    if (Object.keys(data).length) {
      await db.student.updateMany({ where: { id: existing.id, schoolId }, data });
    }

    const plan = row.parent;
    if (plan.status === "existing") {
      const parent = context.parents.find((p) => p.id === plan.id);
      const parentData: Record<string, unknown> = {};
      if (accepted(row, "parentName")) parentData.name = student.parentName;
      if (accepted(row, "parentEmail")) parentData.email = student.parentEmail;
      if (parent && parentData.name) {
        await updateAccount(clerk, parent.id, { username: parent.username, name: student.parentName!, role: "parent" });
      }
      if (parent && Object.keys(parentData).length) {
        await db.parent.updateMany({ where: { id: parent.id, schoolId }, data: parentData });
      }
    }

    const logins: Login[] = [];
    const parentSaved = linkParent && !parentId ? await saveParent(row, existing.id, logins) : true;
    return parentSaved
      ? { sourceRow: row.sourceRow, outcome: "updated", reasons: [], logins }
      : { sourceRow: row.sourceRow, outcome: "failed", reasons: ["parentFailed"], logins };
  };

  // Seats left in each class, taken before a row starts so rows saved at the
  // same time can't overfill a class. A row that fails gives its seat back.
  const freeSeats = new Map(context.classes.map((c) => [c.id, c.capacity - c.studentCount]));
  // A class the school doesn't have is left for the row's own check to report.
  const seatFor = (row: ReviewedStudentRow) => {
    const classId = row.status === "new" || accepted(row, "className") ? row.student.classId : undefined;
    return classId !== undefined && freeSeats.has(classId) ? classId : undefined;
  };

  const saveRow = async (row: ReviewedStudentRow): Promise<SaveRowResult> => {
    const classId = seatFor(row);
    if (classId !== undefined) {
      const left = freeSeats.get(classId) ?? 0;
      if (left <= 0) return { sourceRow: row.sourceRow, outcome: "failed", reasons: ["classFull"], logins: [] };
      freeSeats.set(classId, left - 1);
    }
    let result: SaveRowResult;
    try {
      result = row.status === "new" ? await createRow(row) : await updateRow(row);
    } catch (err) {
      const reason = err instanceof AccountError ? "accountFailed" : "saveFailed";
      result = { sourceRow: row.sourceRow, outcome: "failed", reasons: [reason], logins: [] };
    }
    // A failed row with logins kept its student, and so its seat.
    if (classId !== undefined && result.outcome === "failed" && !result.logins.length) {
      freeSeats.set(classId, (freeSeats.get(classId) ?? 0) + 1);
    }
    return result;
  };

  const results: SaveRowResult[] = new Array(reviewed.length);
  // Rows to save, in chains: rows sharing a new parent's phone form one chain,
  // saved in file order, so the first creates the parent and the rest link it.
  const chains = new Map<string, number[]>();
  reviewed.forEach((row, index) => {
    if (row.status === "skipped") {
      results[index] = { sourceRow: row.sourceRow, outcome: "skipped", reasons: [], logins: [] };
    } else if (!row.canSave) {
      results[index] = { sourceRow: row.sourceRow, outcome: "failed", reasons: reasonsOf(row), logins: [] };
    } else if (row.status === "noChanges") {
      results[index] = { sourceRow: row.sourceRow, outcome: "unchanged", reasons: [], logins: [] };
    } else {
      const key = row.parent.status === "new" ? `parent:${row.parent.phone}` : `row:${row.sourceRow}`;
      chains.set(key, [...(chains.get(key) ?? []), index]);
    }
  });

  await runLimited(
    [...chains.values()].map((indexes) => async () => {
      for (const index of indexes) results[index] = await saveRow(reviewed[index]);
    }),
    ROWS_AT_ONCE,
  );

  // Emails go out once everyone is saved, a few at a time.
  await emailLogins(results.flatMap((result) => result.logins), deps.sendEmail);

  return { results };
};
