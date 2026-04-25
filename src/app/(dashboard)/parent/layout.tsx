import { redirect } from "next/navigation";
import { getAuthUser, requireRole } from "@/lib/auth";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  requireRole(user, ["parent"]);

  return <>{children}</>;
}
