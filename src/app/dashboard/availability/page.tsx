import { CalendarClock } from "lucide-react";
import AvailabilityEditor from "@/components/doctor/AvailabilityEditor";

export const metadata = {
  title: "My Availability",
};

export default function AvailabilityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
          <CalendarClock className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Availability</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Choose the days and times you&apos;re available for appointments.
            Patients can only book within these hours.
          </p>
        </div>
      </div>

      <AvailabilityEditor />
    </div>
  );
}
