import { redirect } from "next/navigation";
import { getAuthUser, requireRoleRedirect } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  requireRoleRedirect(user, ["admin"]);

  return <>{children}</>;
}
