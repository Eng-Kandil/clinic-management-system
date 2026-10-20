"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  MapPin,
  Video,
  Phone,
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";

interface AppointmentDetail {
  _id: string;
  dateTime: string;
  endTime: string;
  type: "in-person" | "remote";
  status: string;
  reason: string;
  notes?: string;
  cancelReason?: string;
  cancelledBy?: { name: string };
  patientId: {
    _id: string;
    user: { _id: string; name: string; email: string };
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    bloodGroup?: string;
  };
  doctorId: {
    _id: string;
    user: { _id: string; name: string; email: string };
    specialization: string;
    department?: string;
  };
  createdAt: string;
  updatedAt: string;
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "no-show";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch appointment");
      setAppointment(data.data);
      setNotes(data.data.notes || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchAppointment();
  }, [id, fetchAppointment]);

  async function updateStatus(status: AppointmentStatus, extra?: Record<string, string>) {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await fetchAppointment();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    await updateStatus("cancelled", { cancelReason: cancelReason.trim() });
    setCancelDialogOpen(false);
    setCancelReason("");
  }

  const [callLoading, setCallLoading] = useState<"video" | "voice" | null>(
    null
  );

  async function startCall(type: "video" | "voice") {
    try {
      setCallLoading(type);
      setError("");
      const res = await fetch(`/api/appointments/${id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not start the call");
      }
      router.push(`/dashboard/consultations/${data.data._id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start the call");
    } finally {
      setCallLoading(null);
    }
  }

  async function handleSaveNotes() {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes");
      await fetchAppointment();
      setNotesDialogOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setActionLoading(false);
    }
  }

  // Determine which actions are available based on current status
  function getActions(): {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "success" | "danger" | "outline" | "secondary";
    onClick: () => void;
    show: boolean;
  }[] {
    if (!appointment) return [];
    const s = appointment.status as AppointmentStatus;

    return [
      {
        label: "Confirm",
        icon: <CheckCircle className="h-4 w-4" />,
        variant: "default" as const,
        onClick: () => updateStatus("confirmed"),
        show: s === "scheduled",
      },
      {
        label: "Start Appointment",
        icon: <PlayCircle className="h-4 w-4" />,
        variant: "success" as const,
        onClick: () => updateStatus("in-progress"),
        show: s === "confirmed",
      },
      {
        label: "Complete",
        icon: <CheckCircle className="h-4 w-4" />,
        variant: "success" as const,
        onClick: () => updateStatus("completed"),
        show: s === "in-progress",
      },
      {
        label: "Mark No-Show",
        icon: <AlertTriangle className="h-4 w-4" />,
        variant: "danger" as const,
        onClick: () => updateStatus("no-show"),
        show: s === "scheduled" || s === "confirmed",
      },
      {
        label: "Cancel",
        icon: <XCircle className="h-4 w-4" />,
        variant: "danger" as const,
        onClick: () => setCancelDialogOpen(true),
        show: s === "scheduled" || s === "confirmed",
      },
      {
        label: "Reschedule",
        icon: <CalendarClock className="h-4 w-4" />,
        variant: "outline" as const,
        onClick: () => router.push(`/dashboard/appointments/new?reschedule=${id}`),
        show: s === "scheduled" || s === "confirmed",
      },
    ].filter((a) => a.show);
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Failed to load appointment
        </h2>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!appointment) return null;

  const dateTime = new Date(appointment.dateTime);
  const endTime = new Date(appointment.endTime);
  const actions = getActions();
  const isCancelled = appointment.status === "cancelled";
  const isCompleted = appointment.status === "completed";
  const isPast = dateTime < new Date();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Appointment Details
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(dateTime, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content - left 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Appointment Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Appointment Information
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Date
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {format(dateTime, "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Time
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {format(dateTime, "h:mm a")} - {format(endTime, "h:mm a")}
                  </p>
                </div>
              </div>

              {/* Type */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  {appointment.type === "remote" ? (
                    <Video className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MapPin className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Type
                  </p>
                  <p className="text-sm font-medium text-slate-900 capitalize">
                    {appointment.type}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {appointment.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </div>
            )}

            {/* Cancel reason */}
            {isCancelled && appointment.cancelReason && (
              <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">
                  Cancellation Reason
                </p>
                <p className="text-sm text-red-700">
                  {appointment.cancelReason}
                </p>
              </div>
            )}
          </div>

          {/* Doctor Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Doctor
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Dr. {appointment.doctorId?.user?.name || "Unknown"}
                </p>
                <p className="text-xs text-slate-500">
                  {appointment.doctorId?.specialization || "General"}
                  {appointment.doctorId?.department &&
                    ` - ${appointment.doctorId.department}`}
                </p>
                {appointment.doctorId?.user?.email && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {appointment.doctorId.user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Patient Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Patient
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {appointment.patientId?.user?.name || "Unknown"}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {appointment.patientId?.gender && (
                    <span className="text-xs text-slate-500 capitalize">
                      {appointment.patientId.gender}
                    </span>
                  )}
                  {appointment.patientId?.dateOfBirth && (
                    <span className="text-xs text-slate-500">
                      DOB:{" "}
                      {format(
                        new Date(appointment.patientId.dateOfBirth),
                        "MMM d, yyyy"
                      )}
                    </span>
                  )}
                  {appointment.patientId?.bloodGroup && (
                    <span className="text-xs text-slate-500">
                      Blood: {appointment.patientId.bloodGroup}
                    </span>
                  )}
                  {appointment.patientId?.phone && (
                    <span className="text-xs text-slate-500">
                      {appointment.patientId.phone}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/patients/${appointment.patientId._id}`)
                }
              >
                View Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - right col */}
        <div className="space-y-6">
          {/* Actions Card */}
          {actions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Actions
              </h2>
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant}
                    onClick={action.onClick}
                    loading={actionLoading}
                    className="w-full justify-start"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Remote consultation — start a live call */}
          {appointment.type === "remote" &&
            (appointment.status === "confirmed" ||
              appointment.status === "in-progress" ||
              appointment.status === "scheduled") && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Remote Consultation
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Start a live call with{" "}
                  {appointment.patientId?.user?.name
                    ? "the patient"
                    : "the doctor"}
                  . Both of you join from this appointment.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    loading={callLoading === "video"}
                    disabled={callLoading !== null}
                    onClick={() => startCall("video")}
                  >
                    <Video className="h-4 w-4" />
                    Start Video Call
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    loading={callLoading === "voice"}
                    disabled={callLoading !== null}
                    onClick={() => startCall("voice")}
                  >
                    <Phone className="h-4 w-4" />
                    Start Voice Call
                  </Button>
                </div>
              </div>
            )}

          {/* Quick Actions - always show */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setNotesDialogOpen(true)}
              >
                <FileText className="h-4 w-4" />
                {appointment.notes ? "Edit Notes" : "Add Notes"}
              </Button>

              {isCompleted && (
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(
                      `/dashboard/emr/${appointment.patientId._id}?appointmentId=${appointment._id}`
                    )
                  }
                >
                  <FileText className="h-4 w-4" />
                  Create Medical Record
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  router.push(`/dashboard/emr/${appointment.patientId._id}`)
                }
              >
                <Stethoscope className="h-4 w-4" />
                View Patient EMR
              </Button>
            </div>
          </div>

          {/* Timeline / Metadata Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Timeline
            </h2>
            <div className="relative space-y-4 pl-6 before:absolute before:left-[9px] before:top-1.5 before:h-[calc(100%-12px)] before:w-0.5 before:bg-slate-200">
              {/* Created */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full border-2 border-blue-400 bg-white" />
                <p className="text-xs font-medium text-slate-900">Created</p>
                <p className="text-xs text-slate-400">
                  {format(new Date(appointment.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>

              {/* Updated (show if different from created) */}
              {appointment.updatedAt !== appointment.createdAt && (
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full border-2 border-amber-400 bg-white" />
                  <p className="text-xs font-medium text-slate-900">
                    Last Updated
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(
                      new Date(appointment.updatedAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  </p>
                </div>
              )}

              {/* Appointment date */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full border-2 ${
                    isPast
                      ? isCompleted
                        ? "border-green-400 bg-green-50"
                        : isCancelled
                        ? "border-red-400 bg-red-50"
                        : "border-slate-300 bg-slate-50"
                      : "border-blue-400 bg-blue-50"
                  }`}
                />
                <p className="text-xs font-medium text-slate-900">
                  {isPast ? "Appointment was" : "Appointment"} on
                </p>
                <p className="text-xs text-slate-400">
                  {format(dateTime, "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Appointment"
        description="Please provide a reason for cancelling this appointment. This action cannot be undone."
      >
        <div className="space-y-4">
          <Textarea
            label="Cancellation Reason"
            placeholder="Enter reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
            >
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={actionLoading}
              disabled={!cancelReason.trim()}
            >
              <XCircle className="h-4 w-4" />
              Cancel Appointment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        title={appointment.notes ? "Edit Notes" : "Add Notes"}
        description="Add any relevant notes for this appointment."
      >
        <div className="space-y-4">
          <Textarea
            label="Notes"
            placeholder="Enter notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNotesDialogOpen(false);
                setNotes(appointment.notes || "");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              loading={actionLoading}
            >
              Save Notes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
