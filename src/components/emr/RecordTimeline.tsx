"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  ChevronRight,
  Stethoscope,
  Activity,
} from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

interface TimelineRecord {
  _id: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string;
  doctorId: {
    user?: { name: string };
  };
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  prescriptionCount?: number;
  symptoms?: string[];
}

interface RecordTimelineProps {
  records: TimelineRecord[];
  patientId: string;
  onSelectRecord?: (recordId: string) => void;
}

export default function RecordTimeline({
  records,
  onSelectRecord,
}: RecordTimelineProps) {
  const router = useRouter();

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <FileText className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          No medical records yet
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Records will appear here after consultations
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

      <div className="space-y-4">
        {records.map((record, index) => {
          const date = new Date(record.visitDate);
          const isFirst = index === 0;

          return (
            <div key={record._id} className="relative pl-12">
              {/* Timeline dot */}
              <div
                className={`absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-white ${
                  isFirst
                    ? "bg-blue-600 ring-4 ring-blue-50"
                    : "bg-slate-300"
                }`}
              />

              {/* Card */}
              <div
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
                onClick={() => {
                  if (onSelectRecord) {
                    onSelectRecord(record._id);
                  } else {
                    router.push(`/dashboard/emr/record/${record._id}`);
                  }
                }}
              >
                {/* Date and Doctor */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {isFirst && (
                      <StatusBadge status="Latest" variant="info" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-blue-600 transition-colors">
                    <span className="text-xs">View Detail</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Doctor */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    Dr. {record.doctorId?.user?.name || "Unknown"}
                  </span>
                </div>

                {/* Complaint & Diagnosis */}
                <div className="mb-2">
                  <p className="text-sm font-medium text-slate-800">
                    {record.chiefComplaint}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Dx: {record.diagnosis}
                  </p>
                </div>

                {/* Vitals Summary */}
                {record.vitals && (
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                    <Activity className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    {record.vitals.bloodPressure && (
                      <span className="text-xs text-slate-500">
                        BP: <span className="font-medium text-slate-700">{record.vitals.bloodPressure}</span>
                      </span>
                    )}
                    {record.vitals.heartRate && (
                      <span className="text-xs text-slate-500">
                        HR: <span className="font-medium text-slate-700">{record.vitals.heartRate} bpm</span>
                      </span>
                    )}
                    {record.vitals.temperature && (
                      <span className="text-xs text-slate-500">
                        Temp: <span className="font-medium text-slate-700">{record.vitals.temperature}°C</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Symptoms tags */}
                {record.symptoms && record.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {record.symptoms.slice(0, 4).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {s}
                      </span>
                    ))}
                    {record.symptoms.length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{record.symptoms.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Prescription count */}
                {record.prescriptionCount !== undefined && record.prescriptionCount > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    {record.prescriptionCount} prescription(s) linked
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
