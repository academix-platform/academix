import { redirect } from "next/navigation";
import { AuthUser, getAuthUser } from "./auth";
import { getAllowedRoles } from "./settings";

export async function enforceRouteAccess(pathname: string): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.schoolId) {
    redirect("/unauthorized");
  }

  const allowedRoles = getAllowedRoles(pathname);

  // Public route
  if (!allowedRoles) {
    return user;
  }

  // Role not allowed
  if (!user.role || !allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}
