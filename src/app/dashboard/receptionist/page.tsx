import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";

export default async function ReceptionistPage() {
  const session = await auth();
  if (!session || session.user.role !== "receptionist") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Reception — Today&apos;s Schedule
      </h1>
      <p className="text-slate-500">
        Patient check-ins and appointments for today.
      </p>
    </div>
  );
}
