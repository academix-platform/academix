import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentSchema } from "../formValidationSchemas";

type Row = Record<string, unknown>;

const mocks = vi.hoisted(() => ({
  saved: { students: [] as Row[], enrollments: [] as Row[] },
  failEnrollment: false,
  classFindUnique: vi.fn(),
  getRequiredAcademicYearId: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  sendAccountEmail: vi.fn(),
}));

// A transaction keeps its writes only when the whole callback succeeds.
vi.mock("../prisma", () => {
  const writer = (into: { students: Row[]; enrollments: Row[] }) => ({
    student: {
      create: async ({ data }: { data: Row }) => {
        into.students.push(data);
        return data;
      },
    },
    studentAcademicYear: {
      create: async ({ data }: { data: Row }) => {
        if (mocks.failEnrollment) throw new Error("enrollment failed");
        into.enrollments.push(data);
        return data;
      },
    },
  });
  return {
    default: {
      class: { findUnique: mocks.classFindUnique },
      ...writer(mocks.saved),
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const pending = { students: [] as Row[], enrollments: [] as Row[] };
        const result = await fn(writer(pending));
        mocks.saved.students.push(...pending.students);
        mocks.saved.enrollments.push(...pending.enrollments);
        return result;
      },
    },
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } }),
}));

vi.mock("../mail", () => ({ sendAccountEmail: mocks.sendAccountEmail }));

vi.mock("./helpers", () => ({
  requireActionAccess: async () => ({ schoolId: 1 }),
  getRequiredAcademicYearId: mocks.getRequiredAcademicYearId,
  isClerkUserNotFoundError: () => false,
  successResult: () => ({ success: true, error: false }),
  errorResult: (err: unknown) => ({ success: false, error: true, message: String(err) }),
}));

import { createStudent } from "./student.actions";

const state = { success: false, error: false };
const student = {
  username: "student1",
  password: "secret123",
  name: "Student",
  email: "student@example.com",
  address: "Address",
  bloodType: "O+",
  sex: "MALE",
  birthday: new Date("2015-01-01"),
  gradeId: 3,
  classId: 2,
  status: "ACTIVE",
} as StudentSchema;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.saved.students.length = 0;
  mocks.saved.enrollments.length = 0;
  mocks.failEnrollment = false;
  mocks.classFindUnique.mockResolvedValue({ capacity: 30, _count: { students: 5 } });
  mocks.getRequiredAcademicYearId.mockResolvedValue(7);
  mocks.createUser.mockResolvedValue({ id: "user_1" });
  mocks.sendAccountEmail.mockResolvedValue(undefined);
});

describe("createStudent", () => {
  it("saves the student and their enrollment in the current year together", async () => {
    const result = await createStudent(state, student);

    expect(result).toMatchObject({ success: true });
    expect(mocks.saved.students).toEqual([expect.objectContaining({ id: "user_1", schoolId: 1, classId: 2 })]);
    expect(mocks.saved.enrollments).toEqual([
      { studentId: "user_1", schoolId: 1, academicYearId: 7, gradeId: 3, classId: 2, performanceStatus: null },
    ]);
    expect(mocks.sendAccountEmail).toHaveBeenCalledWith("student@example.com", "student1", "secret123");
  });

  it("creates nothing when there is no current academic year", async () => {
    mocks.getRequiredAcademicYearId.mockRejectedValue(new Error("No current academic year found."));

    const result = await createStudent(state, student);

    expect(result).toMatchObject({ success: false, error: true });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.saved.students).toEqual([]);
    expect(mocks.saved.enrollments).toEqual([]);
  });

  it("keeps no student and removes the login when the enrollment can't be saved", async () => {
    mocks.failEnrollment = true;

    const result = await createStudent(state, student);

    expect(result).toMatchObject({ success: false, error: true });
    expect(mocks.saved.students).toEqual([]);
    expect(mocks.saved.enrollments).toEqual([]);
    expect(mocks.deleteUser).toHaveBeenCalledWith("user_1");
    expect(mocks.sendAccountEmail).not.toHaveBeenCalled();
  });

  it("keeps the saved student and their login when only the email fails", async () => {
    mocks.sendAccountEmail.mockRejectedValue(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createStudent(state, student);

    expect(result).toMatchObject({ success: true });
    expect(mocks.saved.students).toHaveLength(1);
    expect(mocks.saved.enrollments).toHaveLength(1);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    // The log names the failure, never the address or the password.
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("student@example.com");
    expect(logged).not.toContain("secret123");
  });
});
