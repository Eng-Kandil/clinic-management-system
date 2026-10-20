"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Stethoscope,
  Calendar,
  FileText,
  User,
  Clock,
  Video,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import TimeSlotPicker from "@/components/appointments/TimeSlotPicker";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils/helpers";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DoctorOption {
  _id: string;
  user: { name: string; avatar?: string };
  specialization: string;
  department?: string;
  experience: number;
  consultationFee: number;
  isAvailableForRemote: boolean;
}

interface Step {
  label: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { label: "Department", icon: <Stethoscope className="h-4 w-4" /> },
  { label: "Doctor", icon: <User className="h-4 w-4" /> },
  { label: "Date & Time", icon: <Calendar className="h-4 w-4" /> },
  { label: "Details", icon: <FileText className="h-4 w-4" /> },
  { label: "Confirm", icon: <Check className="h-4 w-4" /> },
];

const DEPARTMENTS = [
  { name: "General Medicine", icon: "🏥", description: "General health consultations" },
  { name: "Cardiology", icon: "❤️", description: "Heart and cardiovascular care" },
  { name: "Dermatology", icon: "🧴", description: "Skin, hair, and nail conditions" },
  { name: "Orthopedics", icon: "🦴", description: "Bones, joints, and muscles" },
  { name: "Pediatrics", icon: "👶", description: "Children's health care" },
  { name: "Neurology", icon: "🧠", description: "Brain and nervous system" },
  { name: "Ophthalmology", icon: "👁️", description: "Eye care and vision" },
  { name: "ENT", icon: "👂", description: "Ear, nose, and throat" },
  { name: "Dentistry", icon: "🦷", description: "Dental and oral health" },
  { name: "Psychiatry", icon: "🧘", description: "Mental health and wellness" },
  { name: "Gynecology", icon: "🩺", description: "Women's health" },
  { name: "Urology", icon: "💊", description: "Urinary tract and male reproductive health" },
];

export default function NewAppointmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<"in-person" | "remote">("in-person");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch doctors when department is selected
  const fetchDoctors = useCallback(async () => {
    if (!selectedDepartment) return;
    setLoadingDoctors(true);
    try {
      const res = await fetch(
        `/api/doctors?department=${encodeURIComponent(selectedDepartment)}&limit=50`
      );
      const json = await res.json();
      if (json.success) {
        setDoctors(json.data || []);
      } else {
        setDoctors([]);
      }
    } catch {
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (currentStep === 1 && selectedDepartment) {
      fetchDoctors();
    }
  }, [currentStep, selectedDepartment, fetchDoctors]);

  // Fetch available slots from the doctor's slots API when date is selected
  const [availableSlots, setAvailableSlots] = useState<
    { startTime: string; endTime: string; available: boolean }[]
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        // Format date as YYYY-MM-DD in UTC
        const year = selectedDate!.getFullYear();
        const month = String(selectedDate!.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate!.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        const res = await fetch(
          `/api/doctors/${selectedDoctor!._id}/slots?date=${dateStr}`
        );
        const json = await res.json();
        if (json.success) {
          setAvailableSlots(json.data || []);
          // Build booked list for backward compatibility
          const booked = (json.data || [])
            .filter((s: { available: boolean }) => !s.available)
            .map((s: { startTime: string }) => s.startTime);
          setBookedSlots(booked);
        }
      } catch {
        setAvailableSlots([]);
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Navigation
  const canNext = () => {
    switch (currentStep) {
      case 0:
        return !!selectedDepartment;
      case 1:
        return !!selectedDoctor;
      case 2:
        return !!selectedDate && !!selectedSlot;
      case 3:
        return reason.trim().length > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (canNext() && currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const [hours, minutes] = selectedSlot.split(":").map(Number);
      // Build the date string in UTC so backend validation (which uses
      // getUTCHours / getUTCDay) sees the same wall-clock time the user picked.
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const dateTime = new Date(`${year}-${month}-${day}T${hh}:${mm}:00.000Z`);

      const endTime = new Date(dateTime.getTime() + 30 * 60 * 1000);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor._id,
          dateTime: dateTime.toISOString(),
          endTime: endTime.toISOString(),
          type: appointmentType,
          reason,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        router.push(`/dashboard/appointments/${json.data?._id || ""}`);
      } else {
        setSubmitError(json.message || "Failed to book appointment");
      }
    } catch {
      setSubmitError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate calendar days for date selection. Every day — including weekends —
  // is selectable so doctors who choose to work Sat/Sun are bookable. Days the
  // selected doctor doesn't work simply return no slots ("pick another date").
  const today = new Date();
  const calendarDays: Date[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    calendarDays.push(d);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/appointments")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Appointments
        </Button>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Book Appointment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Follow the steps below to schedule your appointment
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-6">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  index < currentStep
                    ? "bg-green-100 text-green-700"
                    : index === currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`hidden text-sm font-medium sm:block ${
                  index === currentStep ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-3 h-px w-8 sm:w-12 ${
                  index < currentStep ? "bg-green-300" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Step 1: Department */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Select Department
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.name}
                  type="button"
                  onClick={() => setSelectedDepartment(dept.name)}
                  className={`flex flex-col items-center rounded-xl border p-4 transition-all ${
                    selectedDepartment === dept.name
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <span className="text-2xl">{dept.icon}</span>
                  <span className="mt-2 text-sm font-medium text-slate-900">{dept.name}</span>
                  <span className="mt-0.5 text-xs text-slate-500 text-center">
                    {dept.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Doctor */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Select Doctor
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {selectedDepartment} specialists
            </p>

            {loadingDoctors ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">
                  No doctors found for this department. Try selecting a different department.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {doctors.map((doc) => (
                  <button
                    key={doc._id}
                    type="button"
                    onClick={() => setSelectedDoctor(doc)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      selectedDoctor?._id === doc._id
                        ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg shrink-0">
                      {doc.user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Dr. {doc.user.name}
                      </p>
                      <p className="text-xs text-slate-500">{doc.specialization}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-slate-400">
                          {doc.experience}+ years exp
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(doc.consultationFee, { decimals: 0 })}
                        </span>
                        {doc.isAvailableForRemote && (
                          <span className="flex items-center gap-0.5 text-xs text-blue-600">
                            <Video className="h-3 w-3" />
                            Remote
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Select Date & Time
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Pick a date and available time slot
              </p>

              {/* Appointment Type */}
              <div className="mb-6 flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Type:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      appointmentType === "in-person"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                    onClick={() => setAppointmentType("in-person")}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    In-person
                  </button>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      appointmentType === "remote"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                    onClick={() => setAppointmentType("remote")}
                    disabled={!selectedDoctor?.isAvailableForRemote}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Remote
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Select Date</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {calendarDays.map((d) => {
                    const isSelected =
                      selectedDate &&
                      d.toDateString() === selectedDate.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedSlot(null);
                        }}
                        className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            isSelected ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-bold">{d.getDate()}</span>
                        <span
                          className={`text-xs ${
                            isSelected ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        {isToday && (
                          <span
                            className={`mt-1 rounded px-1.5 text-[10px] font-semibold leading-4 ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <TimeSlotPicker
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                bookedSlots={bookedSlots}
                availableSlots={availableSlots}
                loading={loadingSlots}
              />
            </div>
          </div>
        )}

        {/* Step 4: Reason & Notes */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Add Details
            </h2>
            <Textarea
              label="Reason for Visit *"
              placeholder="Describe the reason for your appointment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <Textarea
              label="Additional Notes (optional)"
              placeholder="Any additional notes or information for the doctor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Review & Confirm
            </h2>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Department</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {selectedDepartment}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Doctor</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      Dr. {selectedDoctor?.user.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedDoctor?.specialization}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Date & Time</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {selectedDate?.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">{selectedSlot}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Type</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {appointmentType === "remote" ? (
                        <Video className="h-3.5 w-3.5 text-blue-500" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-green-500" />
                      )}
                      <span className="text-sm font-medium text-slate-900 capitalize">
                        {appointmentType}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Fee</p>
                    <p className="mt-0.5 text-sm font-semibold text-green-600">
                      {formatCurrency(selectedDoctor?.consultationFee || 0, { decimals: 0 })}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-400 uppercase">Reason</p>
                  <p className="mt-0.5 text-sm text-slate-700">{reason}</p>
                </div>

                {notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Notes</p>
                    <p className="mt-0.5 text-sm text-slate-700">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {submitError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext} disabled={!canNext()}>
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting} disabled={!canNext()}>
            <Check className="mr-1.5 h-4 w-4" />
            Confirm Booking
          </Button>
        )}
      </div>
    </div>
  );
}
