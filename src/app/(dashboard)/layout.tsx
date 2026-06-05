import DashboardShell from "@/components/DashboardShell";
import { getAuthUser } from "@/lib/auth";
import { getSchoolName } from "@/lib/school";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  const schoolName = authUser?.schoolId
    ? await getSchoolName(authUser.schoolId)
    : null;

  return (
    <DashboardShell authUser={authUser} schoolName={schoolName}>
      {children}
    </DashboardShell>
  );
}
