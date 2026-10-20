"use client";

import { Input } from "@/components/ui/input";

interface VitalsData {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

interface VitalsFormProps {
  value: VitalsData;
  onChange: (vitals: VitalsData) => void;
  errors?: Record<string, string>;
}

const VITAL_FIELDS: Array<{
  key: keyof VitalsData;
  label: string;
  unit: string;
  type: "text" | "number";
  placeholder: string;
  min?: number;
  max?: number;
}> = [
  {
    key: "bloodPressure",
    label: "Blood Pressure",
    unit: "mmHg",
    type: "text",
    placeholder: "120/80",
  },
  {
    key: "heartRate",
    label: "Heart Rate",
    unit: "bpm",
    type: "number",
    placeholder: "72",
    min: 0,
    max: 300,
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    type: "number",
    placeholder: "36.6",
    min: 25,
    max: 45,
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    type: "number",
    placeholder: "70",
    min: 0,
    max: 500,
  },
  {
    key: "height",
    label: "Height",
    unit: "cm",
    type: "number",
    placeholder: "170",
    min: 0,
    max: 300,
  },
  {
    key: "oxygenSaturation",
    label: "O2 Saturation",
    unit: "%",
    type: "number",
    placeholder: "98",
    min: 0,
    max: 100,
  },
  {
    key: "respiratoryRate",
    label: "Respiratory Rate",
    unit: "breaths/min",
    type: "number",
    placeholder: "16",
    min: 0,
    max: 100,
  },
];

export default function VitalsForm({ value, onChange, errors }: VitalsFormProps) {
  const handleChange = (key: keyof VitalsData, rawVal: string) => {
    const field = VITAL_FIELDS.find((f) => f.key === key);
    if (!field) return;

    let parsed: string | number | undefined;
    if (field.type === "number") {
      parsed = rawVal === "" ? undefined : parseFloat(rawVal);
    } else {
      parsed = rawVal || undefined;
    }

    onChange({ ...value, [key]: parsed });
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Vitals</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VITAL_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {field.label}
              <span className="ml-1 text-xs text-slate-400">({field.unit})</span>
            </label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={value[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              min={field.min}
              max={field.max}
              step={field.type === "number" ? "0.1" : undefined}
              error={errors?.[field.key]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
