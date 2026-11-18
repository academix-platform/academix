// Test helper: an in-memory stand-in for the Prisma calls the people rules make,
// and a fake Clerk. Filters apply equality, AND, OR, NOT and `in`, so school
// scoping is really exercised. A transaction keeps its writes only when the
// whole callback succeeds. `select` and `include` other than `_count` are
// ignored. Not imported by app code.

import type { ClerkUsers } from "../accounts";

type Where = Record<string, unknown>;
type Row = Record<string, unknown>;

export type FakeStudent = Row & { id: string; schoolId: number; classId: number; parentId?: string | null };
export type FakeParent = Row & { id: string; schoolId: number; phone: string };
export type FakeClass = { id: number; schoolId: number; gradeId: number; capacity: number; name?: string };
export type FakeEnrollment = Row & { studentId: string; academicYearId: number };
export type FakeTeacher = Row & { id: string; schoolId: number; subjectIds?: number[]; classIds?: number[] };
/** `level` is the grade's level, and is the grade's id when left out. */
export type FakeSubject = { id: number; schoolId: number; name: string; gradeId: number; level?: number };

export type FakePeopleData = {
  students?: FakeStudent[];
  parents?: FakeParent[];
  classes?: FakeClass[];
  enrollments?: FakeEnrollment[];
  teachers?: FakeTeacher[];
  subjects?: FakeSubject[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

const matches = (row: Row, where: Where = {}): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === "AND") return (condition as Where[]).every((part) => matches(row, part));
    if (key === "OR") return (condition as Where[]).some((part) => matches(row, part));
    if (key === "NOT") return !matches(row, condition as Where);
    const value = row[key] ?? null;
    if (isObject(condition) && "in" in condition) return (condition.in as unknown[]).includes(value);
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime();
    return value === (condition ?? null);
  });

/** Applies `connect` and `set` on a parent's students, the only relation writes used. */
const linkStudents = (students: FakeStudent[], parentId: string, relation: unknown) => {
  if (!isObject(relation)) return;
  if ("set" in relation) {
    for (const student of students) if (student.parentId === parentId) student.parentId = null;
  }
  const targets = ((relation.connect ?? relation.set) as { id: string }[] | undefined) ?? [];
  for (const { id } of targets) {
    const student = students.find((row) => row.id === id);
    if (!student) throw new Error(`No student ${id} to connect`);
    student.parentId = parentId;
  }
};

/** Applies `connect` and `set` to a teacher's subject or class ids. */
const linkIds = (current: number[], relation: unknown, known: { id: number }[], what: string) => {
  if (!isObject(relation)) return current;
  const targets = ((relation.connect ?? relation.set) as { id: number }[] | undefined) ?? [];
  for (const { id } of targets) {
    if (!known.some((row) => row.id === id)) throw new Error(`No ${what} ${id} to connect`);
  }
  const ids = targets.map(({ id }) => id);
  return "set" in relation ? ids : [...new Set([...current, ...ids])];
};

export const fakePeopleDb = (data: FakePeopleData = {}) => {
  const tables = {
    students: [...(data.students ?? [])].map((row) => ({ ...row })),
    parents: [...(data.parents ?? [])].map((row) => ({ ...row })),
    classes: [...(data.classes ?? [])].map((row) => ({ ...row })),
    enrollments: [...(data.enrollments ?? [])].map((row) => ({ ...row })),
    teachers: [...(data.teachers ?? [])].map(
      (row): FakeTeacher & { subjectIds: number[]; classIds: number[] } => ({ subjectIds: [], classIds: [], ...row }),
    ),
    subjects: [...(data.subjects ?? [])].map((row) => ({ ...row })),
  };
  /** Every object written, as given, to check what reaches the database. */
  const writes: Row[] = [];
  const failures = { studentCreate: false, enrollmentCreate: false, parentCreate: false, teacherCreate: false, teacherUpdate: false };

  const uniqueCheck = (rows: Row[], row: Row, fields: string[]) => {
    for (const field of fields) {
      if (row[field] == null) continue;
      const clash = rows.find(
        (other) => other !== row && other.schoolId === row.schoolId && other[field] === row[field],
      );
      if (clash) throw Object.assign(new Error(`Unique constraint failed on ${field}`), { code: "P2002" });
    }
  };

  let transactionQueue: Promise<unknown> = Promise.resolve();

  const db = {
    class: {
      findUnique: async ({ where }: { where: Where }) => {
        const found = tables.classes.find((row) => matches(row, where));
        if (!found) return null;
        const students = tables.students.filter((student) => student.classId === found.id).length;
        return { ...found, _count: { students } };
      },
      findMany: async ({ where }: { where?: Where } = {}) =>
        tables.classes
          .filter((row) => matches(row, where))
          .map((found) => ({
            ...found,
            name: found.name ?? `class ${found.id}`,
            _count: { students: tables.students.filter((student) => student.classId === found.id).length },
          })),
    },
    student: {
      findFirst: async ({ where }: { where?: Where }) =>
        tables.students.find((row) => matches(row, where)) ?? null,
      findMany: async ({ where }: { where?: Where } = {}) => tables.students.filter((row) => matches(row, where)),
      count: async ({ where }: { where?: Where }) => tables.students.filter((row) => matches(row, where)).length,
      create: async ({ data: row }: { data: Row }) => {
        writes.push(row);
        if (failures.studentCreate) throw new Error("student create failed");
        const created = { parentId: null, ...row } as FakeStudent;
        uniqueCheck(tables.students, created, ["username", "nationalId", "email", "phone"]);
        tables.students.push(created);
        return created;
      },
      updateMany: async ({ where, data: changes }: { where: Where; data: Row }) => {
        writes.push(changes);
        const rows = tables.students.filter((row) => matches(row, where));
        for (const row of rows) {
          Object.assign(row, changes);
          uniqueCheck(tables.students, row, ["username", "nationalId", "email", "phone"]);
        }
        return { count: rows.length };
      },
    },
    studentAcademicYear: {
      create: async ({ data: row }: { data: FakeEnrollment }) => {
        writes.push(row);
        if (failures.enrollmentCreate) throw new Error("enrollment create failed");
        tables.enrollments.push({ ...row });
        return row;
      },
    },
    parent: {
      findFirst: async ({ where }: { where?: Where }) => tables.parents.find((row) => matches(row, where)) ?? null,
      findMany: async ({ where }: { where?: Where } = {}) => tables.parents.filter((row) => matches(row, where)),
      updateMany: async ({ where, data: changes }: { where: Where; data: Row }) => {
        writes.push(changes);
        const rows = tables.parents.filter((row) => matches(row, where));
        for (const row of rows) {
          Object.assign(row, changes);
          uniqueCheck(tables.parents, row, ["username", "email", "phone"]);
        }
        return { count: rows.length };
      },
      create: async ({ data: row }: { data: Row }) => {
        writes.push(row);
        if (failures.parentCreate) throw new Error("parent create failed");
        const { students, ...fields } = row;
        const created = { ...fields } as FakeParent;
        uniqueCheck(tables.parents, created, ["username", "email", "phone"]);
        tables.parents.push(created);
        linkStudents(tables.students, created.id, students);
        return created;
      },
      update: async ({ where, data: changes }: { where: { id: string }; data: Row }) => {
        writes.push(changes);
        const row = tables.parents.find((parent) => parent.id === where.id);
        if (!row) throw new Error(`No parent ${where.id}`);
        const { students, ...fields } = changes;
        Object.assign(row, fields);
        uniqueCheck(tables.parents, row, ["username", "email", "phone"]);
        linkStudents(tables.students, row.id, students);
        return row;
      },
    },
    subject: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        tables.subjects
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row, grade: { level: row.level ?? row.gradeId } })),
    },
    teacher: {
      findFirst: async ({ where }: { where?: Where }) => tables.teachers.find((row) => matches(row, where)) ?? null,
      findMany: async ({ where }: { where?: Where } = {}) =>
        tables.teachers
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row, subjects: (row.subjectIds ?? []).map((id) => ({ id })) })),
      create: async ({ data: row }: { data: Row }) => {
        writes.push(row);
        if (failures.teacherCreate) throw new Error("teacher create failed");
        const { subjects, classes, ...fields } = row;
        const created = {
          ...fields,
          subjectIds: linkIds([], subjects, tables.subjects, "subject"),
          classIds: linkIds([], classes, tables.classes, "class"),
        } as FakeTeacher & { subjectIds: number[]; classIds: number[] };
        uniqueCheck(tables.teachers, created, ["username", "email", "phone"]);
        tables.teachers.push(created);
        return created;
      },
      update: async ({ where, data: changes }: { where: Where; data: Row }) => {
        writes.push(changes);
        if (failures.teacherUpdate) throw new Error("teacher update failed");
        const row = tables.teachers.find((teacher) => matches(teacher, where));
        if (!row) throw Object.assign(new Error("No teacher to update"), { code: "P2025" });
        const { subjects, classes, ...fields } = changes;
        const before = { ...row };
        Object.assign(row, fields);
        try {
          uniqueCheck(tables.teachers, row, ["username", "email", "phone"]);
        } catch (err) {
          Object.assign(row, before);
          throw err;
        }
        row.subjectIds = linkIds(row.subjectIds ?? [], subjects, tables.subjects, "subject");
        row.classIds = linkIds(row.classIds ?? [], classes, tables.classes, "class");
        return row;
      },
    },
    // One transaction at a time: a rollback restores a snapshot of every
    // table, so two open at once would undo each other's rows. Postgres keeps
    // them apart instead; this is the fake's simpler stand-in.
    $transaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const run = async () => {
        const snapshot = JSON.stringify(tables);
        try {
          return await fn(db);
        } catch (err) {
          const restored = JSON.parse(snapshot, (_key, value) =>
            typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) ? new Date(value) : value,
          );
          for (const name of Object.keys(tables) as (keyof typeof tables)[]) {
            tables[name].splice(0, tables[name].length, ...restored[name]);
          }
          throw err;
        }
      };
      const result = transactionQueue.then(run);
      transactionQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };

  return { db, tables, writes, failures };
};

/** A fake Clerk that records accounts and every call, and can be made to fail. */
export const fakeClerk = () => {
  const users = new Map<string, { username: string; password?: string; firstName: string; role: string }>();
  const calls: { method: string; userId?: string; params?: Record<string, unknown> }[] = [];
  let next = 1;
  /** `create` fails every account; `createFor` fails accounts with these usernames. */
  const fail = { create: false, update: false, createFor: new Set<string>(), rateLimitOnce: false };

  const clerk: ClerkUsers & {
    getUserList(params: { username: string[]; limit: number }): Promise<{ data: { username: string | null }[] }>;
  } = {
    async getUserList(params) {
      calls.push({ method: "getUserList", params });
      const taken = [...users.values()].map((user) => user.username);
      return { data: params.username.filter((name) => taken.includes(name)).map((username) => ({ username })) };
    },
    async createUser(params) {
      calls.push({ method: "createUser", params });
      if (fail.rateLimitOnce) {
        fail.rateLimitOnce = false;
        throw Object.assign(new Error("Too Many Requests"), { status: 429, retryAfter: 0 });
      }
      if (fail.create || fail.createFor.has(params.username)) throw new Error("clerk create failed");
      if ([...users.values()].some((user) => user.username === params.username)) {
        throw Object.assign(new Error("That username is taken."), { status: 422 });
      }
      const id = `user_${next++}`;
      users.set(id, { username: params.username, password: params.password, firstName: params.firstName, role: params.publicMetadata.role });
      return { id };
    },
    async updateUser(userId, params) {
      calls.push({ method: "updateUser", userId, params });
      if (fail.update) throw new Error("clerk update failed");
      const user = users.get(userId);
      if (user) Object.assign(user, { username: params.username, firstName: params.firstName, ...(params.password && { password: params.password }) });
      return { id: userId };
    },
    async deleteUser(userId) {
      calls.push({ method: "deleteUser", userId });
      users.delete(userId);
      return { id: userId };
    },
  };

  return { clerk, users, calls, fail };
};
