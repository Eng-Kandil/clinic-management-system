"use client";

import EMRPatientPicker from "@/components/emr/EMRPatientPicker";

export default function EMRPickerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Electronic Medical Records
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Search for a patient to view their EMR.
        </p>
      </div>
      <EMRPatientPicker />
    </div>
  );
}
