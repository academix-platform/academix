import { describe, expect, it } from "vitest";
import { getAllowedRoles, routePermissions } from "./settings";

// src/proxy.ts checks the rules in order and stops at the first match.
const rolesFor = (pathname: string) =>
  Object.entries(routePermissions).find(([route]) =>
    new RegExp(`^${route}$`).test(pathname),
  )?.[1];

describe("routePermissions", () => {
  it.each(["/list/results/class-entry", "/list/results/class-entry/anything"])(
    "keeps students and parents out of %s",
    (pathname) => {
      expect(rolesFor(pathname)).toEqual(["admin", "teacher"]);
    },
  );

  it("keeps students and parents away from printed sheets", () => {
    expect(rolesFor("/list/entry-sheets/abc/print")).toEqual(["admin", "teacher"]);
  });

  it("still lets teachers see the students list", () => {
    expect(rolesFor("/list/students")).toEqual(["admin", "teacher"]);
  });

  it("still lets students and parents see their results", () => {
    expect(rolesFor("/list/results")).toEqual(["admin", "teacher", "student", "parent"]);
  });
});

describe("getAllowedRoles", () => {
  it("matches protected admin routes correctly", () => {
    expect(getAllowedRoles("/admin")).toEqual(["admin"]);
    expect(getAllowedRoles("/admin/feedbacks")).toEqual(["admin"]);
    expect(getAllowedRoles("/settings")).toEqual(["admin"]);
  });

  it("matches teacher and student routes", () => {
    expect(getAllowedRoles("/teacher")).toEqual(["teacher"]);
    expect(getAllowedRoles("/student")).toEqual(["student"]);
    expect(getAllowedRoles("/parent")).toEqual(["parent"]);
  });

  it("matches list routes with path hierarchies correctly", () => {
    expect(getAllowedRoles("/list/results/class-entry")).toEqual(["admin", "teacher"]);
    expect(getAllowedRoles("/list/results/class-entry/123")).toEqual(["admin", "teacher"]);
    expect(getAllowedRoles("/list/results")).toEqual(["admin", "teacher", "student", "parent"]);
    expect(getAllowedRoles("/list/results/456")).toEqual(["admin", "teacher", "student", "parent"]);
    expect(getAllowedRoles("/list/students")).toEqual(["admin", "teacher"]);
    expect(getAllowedRoles("/list/students/stu-1")).toEqual(["admin", "teacher"]);
  });

  it("returns null for non-configured public routes", () => {
    expect(getAllowedRoles("/")).toBeNull();
    expect(getAllowedRoles("/sign-in")).toBeNull();
    expect(getAllowedRoles("/some-unknown-path")).toBeNull();
  });
});

