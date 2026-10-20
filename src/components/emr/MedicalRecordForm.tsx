"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VitalsForm from "@/components/emr/VitalsForm";
import LabResultsTable from "@/components/emr/LabResultsTable";
import {
  createMedicalRecordSchema,
  type CreateMedicalRecordInput,
} from "@/lib/validators/emr.schema";

interface LabResult {
  testName: string;
  result: string;
  unit?: string;
  normalRange?: string;
  date: string;
  isAbnormal?: boolean;
}

interface VitalsData {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

interface MedicalRecordFormProps {
  patientId: string;
  appointmentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MedicalRecordForm({
  patientId,
  appointmentId,
  onSuccess,
  onCancel,
}: MedicalRecordFormProps) {
  const [vitals, setVitals] = useState<VitalsData>({});
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [symptomsInput, setSymptomsInput] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMedicalRecordInput>({
    resolver: zodResolver(createMedicalRecordSchema),
    defaultValues: {
      patientId,
      appointmentId: appointmentId || undefined,
      visitDate: new Date().toISOString(),
      chiefComplaint: "",
      symptoms: [],
      diagnosis: "",
      treatmentPlan: "",
      followUpDate: undefined,
      vitals: {},
    },
  });

  const symptoms = watch("symptoms");

  const handleSymptomsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = symptomsInput.trim().replace(/,+$/, "");
      if (trimmed && !symptoms.includes(trimmed)) {
        const updated = [...symptoms, trimmed];
        setValue("symptoms", updated, { shouldValidate: true });
      }
      setSymptomsInput("");
    }
  };

  const removeSymptom = (index: number) => {
    const updated = symptoms.filter((_, i) => i !== index);
    setValue("symptoms", updated, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateMedicalRecordInput) => {
    setSubmitStatus("loading");
    setErrorMessage("");

    try {
      const payload = {
        ...data,
        vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
      };

      const res = await fetch("/api/emr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        setSubmitStatus("success");

        // If we have lab results, update the record
        if (labResults.length > 0 && json.data?._id) {
          await fetch(`/api/emr/record/${json.data._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ labResults }),
          });
        }

        setTimeout(() => onSuccess?.(), 1000);
      } else {
        setSubmitStatus("error");
        setErrorMessage(json.message || "Failed to create medical record");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Status Messages */}
      {submitStatus === "success" && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">Medical record created successfully!</span>
        </div>
      )}
      {submitStatus === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{errorMessage}</span>
        </div>
      )}

      {/* Visit Date */}
      <Input
        label="Visit Date"
        type="datetime-local"
        {...register("visitDate")}
        error={errors.visitDate?.message}
      />

      {/* Chief Complaint */}
      <Textarea
        label="Chief Complaint"
        placeholder="Patient's primary reason for the visit..."
        {...register("chiefComplaint")}
        error={errors.chiefComplaint?.message}
        rows={2}
      />

      {/* Symptoms (tag input) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Symptoms
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {symptoms.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSymptom(i)}
                className="text-blue-400 hover:text-blue-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          placeholder="Type symptom and press Enter or comma..."
          value={symptomsInput}
          onChange={(e) => setSymptomsInput(e.target.value)}
          onKeyDown={handleSymptomsKeyDown}
          error={errors.symptoms?.message}
        />
      </div>

      {/* Vitals */}
      <VitalsForm
        value={vitals}
        onChange={(v) => {
          setVitals(v);
          setValue("vitals", v);
        }}
      />

      {/* Diagnosis */}
      <Textarea
        label="Diagnosis"
        placeholder="Clinical diagnosis..."
        {...register("diagnosis")}
        error={errors.diagnosis?.message}
        rows={3}
      />

      {/* Treatment Plan */}
      <Textarea
        label="Treatment Plan"
        placeholder="Treatment plan and recommendations..."
        {...register("treatmentPlan")}
        error={errors.treatmentPlan?.message}
        rows={3}
      />

      {/* Lab Results */}
      <LabResultsTable value={labResults} onChange={setLabResults} />

      {/* Follow-up Date */}
      <Input
        label="Follow-up Date"
        type="datetime-local"
        {...register("followUpDate")}
        error={errors.followUpDate?.message}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitStatus === "loading"}>
          <Save className="mr-1.5 h-4 w-4" />
          Save Medical Record
        </Button>
      </div>
    </form>
  );
}
