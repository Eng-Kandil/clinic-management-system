import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";

export default async function CheckInPage() {
  const session = await auth();
  if (!session || session.user.role !== "receptionist") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <UserCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Check-In</h1>
          <p className="text-sm text-slate-500">
            Check in patients for their scheduled appointments.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">
          Search for a patient by name or appointment ID to begin check-in.
        </p>
      </div>
    </div>
  );
}
