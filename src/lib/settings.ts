import { UserRole } from "./utils";

export const ITEM_PER_PAGE = 10;

export const routePermissions: Record<string, UserRole[]> = {
  "/admin(.*)": ["admin"],
  "/teacher(.*)": ["teacher"],
  "/student(.*)": ["student"],
  "/parent(.*)": ["parent"],

  "/list/lessons(.*)": ["admin"],
  "/list/teachers(.*)": ["admin"],
  "/list/students(.*)": ["admin", "teacher"],
  "/list/parents(.*)": ["admin", "teacher"],
  "/list/subjects(.*)": ["admin", "teacher", "student", "parent"],
  "/list/classes(.*)": ["admin", "teacher"],
  "/list/grades(.*)": ["admin"],
  "/list/exams(.*)": ["admin", "teacher", "student", "parent"],
  "/list/assignments(.*)": ["admin", "teacher", "student", "parent"],
  "/list/results(.*)": ["admin", "teacher", "student", "parent"],
  "/list/attendance(.*)": ["admin", "teacher"],
  "/list/events(.*)": ["admin", "teacher", "student", "parent"],
  "/list/announcements(.*)": ["admin", "teacher", "student", "parent"],
  "/settings(.*)": ["admin"],
};

// Get allowed roles for a given pathname
export function getAllowedRoles(pathname: string): UserRole[] | null {
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }

  // Nested match (e.g. /list/attendance/123)
  for (const route in routePermissions) {
    if (pathname.startsWith(route)) {
      return routePermissions[route];
    }
  }

  return null;
}
