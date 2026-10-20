"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, User, Droplets, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import RecordTimeline from "@/components/emr/RecordTimeline";
import MedicalRecordForm from "@/components/emr/MedicalRecordForm";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import StatusBadge from "@/components/shared/StatusBadge";

interface PatientInfo {
  _id: string;
  user: { _id: string; name: string; email: string };
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies: string[];
}

interface MedicalRecordEntry {
  _id: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string;
  doctorId: { user?: { name: string } };
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  symptoms?: string[];
  prescriptionCount?: number;
  treatmentPlan?: string;
  labResults?: Array<{ testName: string; result: string }>;
  followUpDate?: string;
}

interface RecordDetail extends MedicalRecordEntry {
  patientId?: { user?: { name: string } };
  prescriptions?: Array<{
    _id: string;
    medications: Array<{ name: string; dosage: string; frequency: string }>;
    status: string;
  }>;
}

export default function EMRPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [records, setRecords] = useState<MedicalRecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [patRes, recRes] = await Promise.allSettled([
        fetch(`/api/patients/${patientId}`),
        fetch(`/api/emr/${patientId}?limit=50`),
      ]);

      if (patRes.status === "fulfilled" && patRes.value.ok) {
        const pj = await patRes.value.json();
        if (pj.success) setPatient(pj.data);
      }
      if (recRes.status === "fulfilled" && recRes.value.ok) {
        const rj = await recRes.value.json();
        if (rj.success) setRecords(rj.data || []);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) fetchData();
  }, [patientId, fetchData]);

  const handleSelectRecord = async (recordId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/emr/record/${recordId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedRecord(json.data);
      }
    } catch {
      // Error handled silently
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/patients")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Patients
      </Button>

      {/* Patient Info Header */}
      {patient && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-lg font-bold">
                  {patient.user?.name?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{patient.user?.name}</h1>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-slate-500">{patient.user?.email}</span>
                    {patient.bloodType && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Droplets className="h-3.5 w-3.5 text-red-400" />
                        {patient.bloodType}
                      </span>
                    )}
                    {patient.gender && (
                      <span className="flex items-center gap-1 text-sm text-slate-500 capitalize">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {patient.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Record
              </Button>
            </div>

            {/* Allergies */}
            {patient.allergies.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Allergies:</span>
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Record Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={setShowForm}
        title="New Medical Record"
        description="Create a new medical record for this patient"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <MedicalRecordForm
          patientId={patientId}
          onSuccess={() => {
            setShowForm(false);
            fetchData();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>

      {/* Record Detail Dialog */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={() => setSelectedRecord(null)}
        title="Medical Record Detail"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : selectedRecord ? (
          <div className="space-y-5">
            {/* Date & Doctor */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(selectedRecord.visitDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-slate-500">
                  Dr. {selectedRecord.doctorId?.user?.name || "Unknown"}
                </p>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
                Chief Complaint
              </h4>
              <p className="text-sm text-slate-800">{selectedRecord.chiefComplaint}</p>
            </div>

            {/* Symptoms */}
            {selectedRecord.symptoms && selectedRecord.symptoms.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
                  Symptoms
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecord.symptoms.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Vitals */}
            {selectedRecord.vitals && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Vitals
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(selectedRecord.vitals).map(([key, val]) =>
                    val ? (
                      <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {String(val)}
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
                Diagnosis
              </h4>
              <p className="text-sm text-slate-800">{selectedRecord.diagnosis}</p>
            </div>

            {/* Treatment Plan */}
            {selectedRecord.treatmentPlan && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
                  Treatment Plan
                </h4>
                <p className="text-sm text-slate-800">{selectedRecord.treatmentPlan}</p>
              </div>
            )}

            {/* Lab Results */}
            {selectedRecord.labResults && selectedRecord.labResults.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Lab Results
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 font-medium text-slate-600">Test</th>
                        <th className="px-3 py-2 font-medium text-slate-600">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.labResults.map((lr, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-2 text-slate-700">{lr.testName}</td>
                          <td className="px-3 py-2 text-slate-700">{lr.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Prescriptions */}
            {selectedRecord.prescriptions && selectedRecord.prescriptions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">
                  Prescriptions
                </h4>
                <div className="space-y-2">
                  {selectedRecord.prescriptions.map((rx) => (
                    <div
                      key={rx._id}
                      className="rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={rx.status} />
                      </div>
                      {rx.medications.map((med, i) => (
                        <p key={i} className="text-sm text-slate-700">
                          <span className="font-medium">{med.name}</span> - {med.dosage},{" "}
                          {med.frequency}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {selectedRecord.followUpDate && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">
                  Follow-up Date
                </h4>
                <p className="text-sm text-slate-800">
                  {new Date(selectedRecord.followUpDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>

      {/* Records Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Medical Records ({records.length})
          </h2>
        </div>
        <RecordTimeline
          records={records}
          patientId={patientId}
          onSelectRecord={handleSelectRecord}
        />
      </div>
    </div>
  );
}
