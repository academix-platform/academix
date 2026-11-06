import { describe, expect, it } from "vitest";
import {
  allTeachersFound,
  subjectAccessWhere,
  subjectClassContentWhere,
  subjectMaterialWhere,
} from "./access";

describe("subjectAccessWhere", () => {
  it("lets an admin open any subject of the school", () => {
    expect(subjectAccessWhere("admin", "a1")).toEqual({});
  });

  it("limits a teacher to subjects assigned to them", () => {
    expect(subjectAccessWhere("teacher", "t1")).toEqual({
      teachers: { some: { id: "t1" } },
    });
  });

  it("limits a student to subjects of their grade", () => {
    expect(subjectAccessWhere("student", "s1")).toEqual({
      grade: { students: { some: { id: "s1" } } },
    });
  });

  it("limits a parent to subjects of their children's grades", () => {
    expect(subjectAccessWhere("parent", "p1")).toEqual({
      grade: { students: { some: { parentId: "p1" } } },
    });
  });

  it("matches nothing for an unknown role or a missing user", () => {
    expect(subjectAccessWhere("superadmin", "x")).toEqual({ id: -1 });
    expect(subjectAccessWhere("teacher", null)).toEqual({ id: -1 });
    expect(subjectAccessWhere(undefined, "x")).toEqual({ id: -1 });
  });
});

describe("subjectClassContentWhere", () => {
  it("shows staff all classes of the current year", () => {
    expect(subjectClassContentWhere("admin", "a1", 7)).toEqual({
      academicYearId: 7,
    });
    expect(subjectClassContentWhere("teacher", "t1", 7)).toEqual({
      academicYearId: 7,
    });
  });

  it("shows a student only their own classes", () => {
    const inStudentClass = { students: { some: { id: "s1" } } };
    expect(subjectClassContentWhere("student", "s1", 7)).toEqual({
      academicYearId: 7,
      OR: [{ class: inStudentClass }, { lesson: { class: inStudentClass } }],
    });
  });

  it("shows a parent only their children's classes", () => {
    const inChildClass = { students: { some: { parentId: "p1" } } };
    expect(subjectClassContentWhere("parent", "p1", 7)).toEqual({
      academicYearId: 7,
      OR: [{ class: inChildClass }, { lesson: { class: inChildClass } }],
    });
  });

  it("shows nothing when the school has no current year", () => {
    expect(subjectClassContentWhere("admin", "a1", null)).toEqual({ id: -1 });
  });
});

describe("subjectMaterialWhere", () => {
  it("keeps materials of the current year only", () => {
    expect(subjectMaterialWhere(3)).toEqual({ academicYearId: 3 });
    expect(subjectMaterialWhere(null)).toEqual({ id: -1 });
  });
});

describe("allTeachersFound", () => {
  it("accepts when every requested teacher is in the school", () => {
    expect(allTeachersFound(["t1", "t2", "t1"], ["t1", "t2"])).toBe(true);
    expect(allTeachersFound([], [])).toBe(true);
  });

  it("rejects a teacher from another school", () => {
    expect(allTeachersFound(["t1", "other"], ["t1"])).toBe(false);
  });
});
