import { redirect } from "next/navigation";
import { getAuthUser } from "./auth";
import { getAllowedRoles } from "./settings";

// Enforces authentication + role-based access for a route

export async function enforceRouteAccess(pathname: string) {
  const user = await getAuthUser();

  // Not logged in → go to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  const allowedRoles = getAllowedRoles(pathname);

  // No rules → public route
  if (!allowedRoles) {
    return user;
  }

  // Role not allowed → block
  if (!user.role || !allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}
