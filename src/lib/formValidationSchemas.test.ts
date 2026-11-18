import { describe, expect, it } from "vitest";
import { parentSchema, studentSchema, teacherSchema } from "./formValidationSchemas";

// What the manual forms send when the optional fields are left empty.
const emptyOptional = { address: "", bloodType: "", birthday: "" };

const student = {
  username: "s482913",
  name: "Lina Haddad",
  nationalId: "123456782",
  sex: "FEMALE",
  gradeId: "1",
  classId: "1",
};
const teacher = {
  username: "t482913",
  name: "Omar Saleh",
  sex: "MALE",
  subjectClassPairs: [{ subjectId: "3" }],
};
const parent = { username: "p482913", name: "Sami Haddad", phone: "0599123456" };

describe("optional person fields", () => {
  it("lets a student be saved without blood type, address or birthday", () => {
    const parsed = studentSchema.safeParse({ ...student, ...emptyOptional });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ address: "", bloodType: "", birthday: undefined });
  });

  it("lets a teacher be saved without blood type, address or birthday", () => {
    const parsed = teacherSchema.safeParse({ ...teacher, ...emptyOptional });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.birthday).toBeUndefined();
  });

  it("lets a parent be saved without an address", () => {
    expect(parentSchema.safeParse({ ...parent, address: "" }).success).toBe(true);
    expect(parentSchema.safeParse(parent).success).toBe(true);
  });

  it("still keeps filled values", () => {
    const parsed = studentSchema.safeParse({
      ...student,
      address: "Gaza",
      bloodType: "A+",
      birthday: "2012-03-04",
    });
    expect(parsed.data).toMatchObject({ address: "Gaza", bloodType: "A+" });
    expect(parsed.data?.birthday).toEqual(new Date("2012-03-04"));
  });

  it("still refuses a birthday that isn't a date", () => {
    expect(studentSchema.safeParse({ ...student, birthday: "not a date" }).success).toBe(false);
    expect(teacherSchema.safeParse({ ...teacher, birthday: "not a date" }).success).toBe(false);
  });

  it("still requires the student's name, class and sex", () => {
    expect(studentSchema.safeParse({ ...student, name: "" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...student, classId: "" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...student, sex: undefined }).success).toBe(false);
  });

  it("still requires a subject in the manual teacher form", () => {
    expect(teacherSchema.safeParse({ ...teacher, subjectClassPairs: [] }).success).toBe(false);
  });
});

describe("student national ID", () => {
  const idError = (nationalId: unknown) => {
    const parsed = studentSchema.safeParse({ ...student, nationalId });
    return parsed.success ? null : parsed.error.flatten().fieldErrors.nationalId?.[0];
  };

  it("is required", () => {
    expect(idError("")).toBe("nationalIdRequired");
    expect(idError(undefined)).toBe("nationalIdRequired");
  });

  it("must have up to 9 digits and a right check digit", () => {
    expect(idError("12345678a")).toBe("nationalIdFormat");
    expect(idError("1234567820")).toBe("nationalIdFormat");
    expect(idError("123456781")).toBe("nationalIdCheckDigit");
  });

  it("is saved as 9 Western digits", () => {
    expect(studentSchema.parse({ ...student, nationalId: "١٨" }).nationalId).toBe("000000018");
  });
});
