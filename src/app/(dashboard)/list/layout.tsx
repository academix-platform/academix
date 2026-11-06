import { redirect } from "next/navigation";
import { enforceAdminSchoolAccess, getAuthUser } from "@/lib/auth";

export default async function ListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  await enforceAdminSchoolAccess(user);

  return <div className="h-full overflow-auto">{children}</div>;
}
