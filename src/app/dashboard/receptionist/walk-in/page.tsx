import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

export default async function WalkInPage() {
  const session = await auth();
  if (!session || session.user.role !== "receptionist") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Walk-in Registration</h1>
          <p className="text-sm text-slate-500">
            Register a new walk-in patient and assign them to available slots.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">
          Complete the registration form to add a new walk-in patient.
        </p>
      </div>
    </div>
  );
}
