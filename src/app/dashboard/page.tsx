import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth.config";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardContent
      role={session.user.role}
      userName={session.user.name ?? "User"}
    />
  );
}
