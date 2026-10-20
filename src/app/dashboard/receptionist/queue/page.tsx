import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export default async function QueuePage() {
  const session = await auth();
  if (!session || session.user.role !== "receptionist") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Clock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waiting Queue</h1>
          <p className="text-sm text-slate-500">
            View and manage patients currently waiting to be seen.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">No patients currently in the waiting queue.</p>
      </div>
    </div>
  );
}
