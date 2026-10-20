"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Droplet,
  ArrowLeft,
  MapPin,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  Users,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import BloodTypeSelector from "@/components/blood-bridge/BloodTypeSelector";
import { cn } from "@/lib/utils/helpers";

const URGENCY_OPTIONS = [
  { label: "Routine", value: "routine" },
  { label: "Urgent", value: "urgent" },
  { label: "Emergency", value: "emergency" },
];

interface FormData {
  bloodType: string;
  unitsNeeded: string;
  urgency: string;
  hospital: string;
  deadline: string;
  notes: string;
  patientName: string;
}

export default function CreateBloodRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    bloodType: "",
    unitsNeeded: "1",
    urgency: "routine",
    hospital: "",
    deadline: "",
    notes: "",
    patientName: "",
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.bloodType) newErrors.bloodType = "Please select a blood type";
    if (
      !formData.unitsNeeded ||
      parseInt(formData.unitsNeeded) < 1 ||
      parseInt(formData.unitsNeeded) > 10
    ) {
      newErrors.unitsNeeded = "Units must be between 1 and 10";
    }
    if (!formData.hospital) newErrors.hospital = "Hospital name is required";
    if (!formData.deadline) newErrors.deadline = "Required by date is needed";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        bloodType: formData.bloodType,
        unitsNeeded: parseInt(formData.unitsNeeded),
        urgency: formData.urgency || "routine",
        hospital: formData.hospital,
        deadline: new Date(formData.deadline).toISOString(),
        notes: formData.notes || undefined,
        patientName: formData.patientName || undefined,
        location: {
          type: "Point" as const,
          coordinates: [0, 0] as [number, number],
          address: formData.hospital,
        },
      };

      const res = await fetch("/api/blood-bridge/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMatchedCount(json.data?.matchedDonorsCount || 0);
        setStep("success");
      } else {
        setErrors({ form: json.message || "Failed to create request" });
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
          {/* Success header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">Request Created Successfully</h2>
            <p className="mt-1 text-green-100">
              Your blood request has been submitted
            </p>
          </div>

          {/* Match result */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {matchedCount}
                </p>
                <p className="text-sm text-slate-500">
                  Compatible donor{matchedCount !== 1 ? "s" : ""} found and
                  notified
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  What happens next?
                </p>
                <p className="text-xs text-blue-600">
                  Compatible donors have been notified. They will review your
                  request and respond. You&apos;ll be able to track responses on
                  the Blood Bridge page.
                </p>
              </div>
            </div>

            {/* Request summary */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Request Summary
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Blood Type</span>
                <span className="font-medium text-slate-900 flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                  {formData.bloodType}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Units Needed</span>
                <span className="font-medium text-slate-900">
                  {formData.unitsNeeded}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Urgency</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    formData.urgency === "emergency"
                      ? "bg-red-100 text-red-700"
                      : formData.urgency === "urgent"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  )}
                >
                  {formData.urgency.charAt(0).toUpperCase() +
                    formData.urgency.slice(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Hospital</span>
                <span className="font-medium text-slate-900">
                  {formData.hospital}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Required By</span>
                <span className="font-medium text-slate-900">
                  {new Date(formData.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard/blood-bridge")}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Blood Bridge
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  setStep("form");
                  setFormData({
                    bloodType: "",
                    unitsNeeded: "1",
                    urgency: "routine",
                    hospital: "",
                    deadline: "",
                    notes: "",
                    patientName: "",
                  });
                }}
              >
                <Heart className="mr-1.5 h-4 w-4" />
                Create Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form screen ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/blood-bridge")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Create Blood Request
          </h1>
          <p className="text-sm text-slate-500">
            Submit a request for blood donors
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {errors.form && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errors.form}
          </div>
        )}

        {/* Patient Name */}
        <Input
          label="Patient Name (optional)"
          placeholder="Enter patient name"
          value={formData.patientName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, patientName: e.target.value }))
          }
        />

        {/* Blood Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            <Droplet className="mr-1.5 inline h-4 w-4 text-red-500" />
            Blood Type Required *
          </label>
          <BloodTypeSelector
            value={formData.bloodType}
            onChange={(type) =>
              setFormData((prev) => ({ ...prev, bloodType: type }))
            }
            showCompatibility
          />
          {errors.bloodType && (
            <p className="mt-1.5 text-xs text-red-600">{errors.bloodType}</p>
          )}
        </div>

        {/* Units + Urgency */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Units Needed *"
            type="number"
            min={1}
            max={10}
            value={formData.unitsNeeded}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, unitsNeeded: e.target.value }))
            }
            error={errors.unitsNeeded}
          />
          <Select
            label="Urgency Level"
            options={URGENCY_OPTIONS}
            value={formData.urgency}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, urgency: e.target.value }))
            }
          />
        </div>

        {/* Hospital */}
        <Input
          label="Hospital Name *"
          placeholder="Enter hospital name"
          value={formData.hospital}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, hospital: e.target.value }))
          }
          error={errors.hospital}
          icon={<MapPin className="h-4 w-4" />}
        />

        {/* Required By */}
        <Input
          label="Required By *"
          type="date"
          value={formData.deadline}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, deadline: e.target.value }))
          }
          error={errors.deadline}
          icon={<Clock className="h-4 w-4" />}
        />

        {/* Notes */}
        <Textarea
          label="Additional Notes"
          placeholder="Any additional information about the request..."
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
        />

        {/* Urgency banner */}
        {formData.urgency === "emergency" && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Emergency Request
              </p>
              <p className="text-xs text-red-600">
                This request will be flagged as critical. All compatible donors
                will be prioritized for immediate notification.
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/dashboard/blood-bridge")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
