"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

interface SideEffectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  treatmentEntryId: string;
  onSubmit: (data: {
    treatmentEntryId: string;
    description: string;
    severity: "mild" | "moderate" | "severe";
    date: string;
  }) => void;
  loading?: boolean;
}

const SEVERITY_OPTIONS = [
  { label: "Mild - minor discomfort", value: "mild" },
  { label: "Moderate - noticeable impact", value: "moderate" },
  { label: "Severe - needs medical attention", value: "severe" },
];

export default function SideEffectForm({
  open,
  onOpenChange,
  medicationName,
  treatmentEntryId,
  onSubmit,
  loading = false,
}: SideEffectFormProps) {
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">(
    "mild"
  );
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Please describe the side effect");
      return;
    }

    onSubmit({
      treatmentEntryId,
      description: description.trim(),
      severity,
      date: date!,
    });

    // Reset form
    setDescription("");
    setSeverity("mild");
    setDate(new Date().toISOString().split("T")[0]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Report Side Effect"
      description={`Report a side effect for ${medicationName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Severity indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700">
            This report will be shared with your healthcare provider. If you are
            experiencing a medical emergency, please call emergency services
            immediately.
          </p>
        </div>

        {/* Description */}
        <Textarea
          label="Describe the side effect"
          placeholder="e.g., Nausea and dizziness after taking the medication..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={error}
          rows={3}
        />

        {/* Severity */}
        <Select
          label="Severity"
          options={SEVERITY_OPTIONS}
          value={severity}
          onChange={(e) =>
            setSeverity(e.target.value as "mild" | "moderate" | "severe")
          }
        />

        {/* Severity color indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              severity === "mild"
                ? "bg-yellow-400"
                : severity === "moderate"
                  ? "bg-orange-500"
                  : "bg-red-600"
            }`}
          />
          <span className="text-xs text-slate-500">
            {severity === "mild"
              ? "Minor discomfort, does not interfere with daily activities"
              : severity === "moderate"
                ? "Noticeable impact on daily activities"
                : "Significant impact, may require medical attention"}
          </span>
        </div>

        {/* Date */}
        <Input
          label="When did this occur?"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
          >
            <AlertTriangle className="h-4 w-4" />
            Submit Report
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
