import { redirect } from "next/navigation";
import { enforceAdminSchoolAccess, getAuthUser, requireRole } from "@/lib/auth";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  requireRole(user, ["teacher"]);
  await enforceAdminSchoolAccess(user);

  return <>{children}</>;
}
