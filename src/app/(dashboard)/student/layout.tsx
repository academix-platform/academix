import { redirect } from "next/navigation";
import { getAuthUser, requireRoleRedirect } from "@/lib/auth";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  requireRoleRedirect(user, ["student"]);

  return <>{children}</>;
}
