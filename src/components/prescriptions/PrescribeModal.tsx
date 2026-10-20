"use client";

import { useState } from "react";
import { Plus, Trash2, Pill, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/useToast";

const FREQUENCY_OPTIONS = [
  { label: "Once daily", value: "Once daily" },
  { label: "Twice daily", value: "Twice daily" },
  { label: "Three times daily", value: "Three times daily" },
  { label: "Four times daily", value: "Four times daily" },
  { label: "Every 12 hours", value: "Every 12 hours" },
  { label: "Every 8 hours", value: "Every 8 hours" },
  { label: "As needed", value: "As needed" },
];

interface MedRow {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}

const emptyRow: MedRow = {
  name: "",
  dosage: "",
  frequency: "Once daily",
  durationDays: "7",
  instructions: "",
};

interface PrescribeModalProps {
  patientId: string;
  patientName?: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function PrescribeModal({
  patientId,
  patientName,
  open,
  onClose,
  onCreated,
}: PrescribeModalProps) {
  const [rows, setRows] = useState<MedRow[]>([{ ...emptyRow }]);
  const [startDate, setStartDate] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const updateRow = (idx: number, field: keyof MedRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };
  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const handleSubmit = async () => {
    // Validate
    for (const r of rows) {
      if (!r.name.trim() || !r.dosage.trim() || !r.frequency) {
        toast({
          type: "error",
          title: "Incomplete medication",
          description: "Name, dosage and frequency are required for each medication.",
        });
        return;
      }
      const days = Number(r.durationDays);
      if (!Number.isFinite(days) || days < 1) {
        toast({
          type: "error",
          title: "Invalid period",
          description: "Duration must be at least 1 day.",
        });
        return;
      }
    }

    const start = new Date(`${startDate}T00:00:00`);
    const medications = rows.map((r) => {
      const days = Math.max(1, Math.round(Number(r.durationDays)));
      const end = new Date(start);
      end.setDate(end.getDate() + days - 1);
      end.setHours(23, 59, 59, 0);
      return {
        name: r.name.trim(),
        dosage: r.dosage.trim(),
        frequency: r.frequency,
        duration: `${days} day${days > 1 ? "s" : ""}`,
        instructions: r.instructions.trim() || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    });

    setSaving(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, medications, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast({
          type: "success",
          title: "Medication added",
          description: `${medications.length} medication(s) prescribed${
            patientName ? ` for ${patientName}` : ""
          }.`,
        });
        setRows([{ ...emptyRow }]);
        setNotes("");
        onCreated();
        onClose();
      } else {
        toast({
          type: "error",
          title: "Could not prescribe",
          description: json.message || "Please check the form and try again.",
        });
      }
    } catch {
      toast({ type: "error", title: "Network error", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Add Medication</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Prescribe one or more medications{patientName ? ` for ${patientName}` : ""}. The
          patient will see them under “My Medications”.
        </p>

        {/* Start date */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Start date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        {/* Medication rows */}
        <div className="mt-4 space-y-4">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Medication {idx + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Name"
                  placeholder="e.g. Amoxicillin"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                />
                <Input
                  label="Dosage"
                  placeholder="e.g. 500 mg"
                  value={row.dosage}
                  onChange={(e) => updateRow(idx, "dosage", e.target.value)}
                />
                <Select
                  label="Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={row.frequency}
                  onChange={(e) => updateRow(idx, "frequency", e.target.value)}
                />
                <Input
                  label="Period (days)"
                  type="number"
                  min={1}
                  value={row.durationDays}
                  onChange={(e) => updateRow(idx, "durationDays", e.target.value)}
                />
              </div>
              <Input
                label="Instructions (optional)"
                placeholder="e.g. Take after meals"
                value={row.instructions}
                onChange={(e) => updateRow(idx, "instructions", e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" /> Add another medication
        </button>

        <div className="mt-4">
          <Textarea
            label="Notes (optional)"
            placeholder="Any notes for this prescription..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Pill className="mr-1.5 h-4 w-4" /> Prescribe
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
