import { redirect } from "next/navigation";
import { enforceAdminSchoolAccess, getAuthUser, requireRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  requireRole(user, ["admin"]);
  await enforceAdminSchoolAccess(user);

  return <>{children}</>;
}
