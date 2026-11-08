import { describe, expect, it } from "vitest";
import { routePermissions } from "./settings";

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

  it("still lets students and parents see their results", () => {
    expect(rolesFor("/list/results")).toEqual(["admin", "teacher", "student", "parent"]);
  });
});
