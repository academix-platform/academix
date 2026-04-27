import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function ListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
