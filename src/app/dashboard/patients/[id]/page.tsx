"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Droplets,
  AlertTriangle,
  Activity,
  Pill,
  FileText,
  Clock,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/shared/StatusBadge";
import { PageSkeleton } from "@/components/shared/LoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import PrescribeModal from "@/components/prescriptions/PrescribeModal";

interface PatientData {
  _id: string;
  user: { _id: string; name: string; email: string; phone?: string; avatar?: string };
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
  address?: string;
  insuranceInfo?: { provider: string; policyNumber: string };
}

interface MedicalRecordItem {
  _id: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string;
  doctor: { user: { name: string } };
  vitals?: Record<string, unknown>;
}

interface PrescriptionItem {
  _id: string;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  status: string;
  createdAt: string;
  doctor: { user: { name: string } };
}

interface AppointmentItem {
  _id: string;
  dateTime: string;
  type: string;
  status: string;
  reason: string;
  doctorId: { user: { name: string } };
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrescribe, setShowPrescribe] = useState(false);

  const reloadPrescriptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/prescriptions?patientId=${id}&limit=20`);
      if (res.ok) {
        const j = await res.json();
        if (j.success) setPrescriptions(j.data || []);
      }
    } catch {
      // non-critical
    }
  }, [id]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [patRes, recRes, presRes, apptRes] = await Promise.allSettled([
          fetch(`/api/patients/${id}`),
          fetch(`/api/emr/${id}?limit=20`),
          fetch(`/api/prescriptions?patientId=${id}&limit=20`),
          fetch(`/api/appointments?patientId=${id}&limit=20`),
        ]);

        if (patRes.status === "fulfilled" && patRes.value.ok) {
          const pj = await patRes.value.json();
          if (pj.success) setPatient(pj.data);
        }
        if (recRes.status === "fulfilled" && recRes.value.ok) {
          const rj = await recRes.value.json();
          if (rj.success) setRecords(rj.data || []);
        }
        if (presRes.status === "fulfilled" && presRes.value.ok) {
          const prj = await presRes.value.json();
          if (prj.success) setPrescriptions(prj.data || []);
        }
        if (apptRes.status === "fulfilled" && apptRes.value.ok) {
          const aj = await apptRes.value.json();
          if (aj.success) setAppointments(aj.data || []);
        }
      } catch {
        // Errors handled gracefully
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  if (loading) return <PageSkeleton />;

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Patient not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  const activePrescriptions = prescriptions.filter((p) => p.status === "active");
  const recentRecords = records.slice(0, 3);
  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.dateTime) > new Date() && a.status !== "cancelled"
  );

  const tabsData = [
    {
      label: "Overview",
      value: "overview",
      content: (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Vitals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Recent Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRecords[0]?.vitals ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(recentRecords[0]!.vitals).map(([key, value]) =>
                    value ? (
                      <div key={key} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="mt-0.5 font-semibold text-slate-900">
                          {String(value)}
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No vitals recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-green-600" />
                Active Medications ({activePrescriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activePrescriptions.length > 0 ? (
                <div className="space-y-3">
                  {activePrescriptions.slice(0, 5).map((p) =>
                    p.medications.map((med, idx) => (
                      <div
                        key={`${p._id}-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{med.name}</p>
                          <p className="text-xs text-slate-500">
                            {med.dosage} - {med.frequency}
                          </p>
                        </div>
                        <StatusBadge status="active" />
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No active medications</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-amber-600" />
                Upcoming Appointments ({upcomingAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 5).map((appt) => (
                    <div
                      key={appt._id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/appointments/${appt._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(appt.dateTime).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            Dr. {appt.doctorId?.user?.name} - {appt.reason}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No upcoming appointments</p>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      label: "Medical Records",
      value: "records",
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => router.push(`/dashboard/emr/${id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              View Full EMR
            </Button>
          </div>
          {records.length > 0 ? (
            <div className="space-y-3">
              {records.map((record) => (
                <Card key={record._id} className="hover:border-blue-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(record.visitDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-sm text-slate-500">
                            Dr. {record.doctor?.user?.name}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {record.chiefComplaint}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          Diagnosis: {record.diagnosis}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-10">
              No medical records found
            </p>
          )}
        </div>
      ),
    },
    {
      label: "Prescriptions",
      value: "prescriptions",
      content: (
        <div className="space-y-4">
          {isDoctor && (
            <div className="flex justify-end">
              <Button onClick={() => setShowPrescribe(true)}>
                <Pill className="mr-2 h-4 w-4" />
                Add Medication
              </Button>
            </div>
          )}
          {prescriptions.length > 0 ? (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <Card key={rx._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-slate-500">
                            {new Date(rx.createdAt).toLocaleDateString()}
                          </span>
                          <StatusBadge status={rx.status} />
                        </div>
                        <div className="space-y-1">
                          {rx.medications.map((med, idx) => (
                            <p key={idx} className="text-sm text-slate-700">
                              <span className="font-medium">{med.name}</span> - {med.dosage},{" "}
                              {med.frequency}
                            </p>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Prescribed by Dr. {rx.doctor?.user?.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-10">
              No prescriptions found
            </p>
          )}
        </div>
      ),
    },
    {
      label: "Appointments",
      value: "appointments",
      content: (
        <div className="space-y-4">
          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <Card
                  key={appt._id}
                  className="cursor-pointer hover:border-blue-200 transition-colors"
                  onClick={() => router.push(`/dashboard/appointments/${appt._id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Calendar className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(appt.dateTime).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            Dr. {appt.doctorId?.user?.name} - {appt.type}
                          </p>
                          <p className="text-xs text-slate-400">{appt.reason}</p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-10">
              No appointments found
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/patients")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Patients
      </Button>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold shrink-0">
              {patient.user?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            {/* Info Grid */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{patient.user?.name}</h1>
                <p className="text-sm text-slate-500">Patient ID: {patient._id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{patient.user?.email}</span>
                </div>
                {patient.user?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{patient.user.phone}</span>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {new Date(patient.dateOfBirth).toLocaleDateString()} (Age:{" "}
                      {calculateAge(patient.dateOfBirth)})
                    </span>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 capitalize">{patient.gender}</span>
                  </div>
                )}
                {patient.bloodType && (
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-slate-600">{patient.bloodType}</span>
                  </div>
                )}
              </div>

              {/* Allergies & Conditions */}
              <div className="flex flex-wrap gap-4">
                {patient.allergies.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">Allergies</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {patient.allergies.map((a, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {patient.chronicConditions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Activity className="mt-0.5 h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">Chronic Conditions</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {patient.chronicConditions.map((c, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabsData} defaultValue="overview" />

      {/* Add medication (doctor) */}
      {isDoctor && (
        <PrescribeModal
          patientId={id}
          patientName={patient.user?.name}
          open={showPrescribe}
          onClose={() => setShowPrescribe(false)}
          onCreated={reloadPrescriptions}
        />
      )}
    </div>
  );
}
