"use client";

import { cn } from "@/lib/utils/helpers";
import { Droplet } from "lucide-react";
import { getBloodTypeCompatibility } from "@/lib/utils/helpers";
import { useState } from "react";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;

const BLOOD_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "O-": { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  "O+": { bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  "A-": { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
  "A+": { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
  "B-": { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700" },
  "B+": { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700" },
  "AB-": { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
  "AB+": { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
};

interface BloodTypeSelectorProps {
  value?: string;
  onChange: (type: string) => void;
  showCompatibility?: boolean;
  className?: string;
}

export default function BloodTypeSelector({
  value,
  onChange,
  showCompatibility = false,
  className,
}: BloodTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const activeType = hoveredType || value;
  const compatibleTypes = activeType
    ? getBloodTypeCompatibility(activeType)
    : [];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {BLOOD_TYPES.map((type) => {
          const colors = BLOOD_TYPE_COLORS[type]!;
          const isSelected = value === type;
          const isCompatible = compatibleTypes.includes(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-200",
                isSelected
                  ? "border-red-500 bg-red-50 shadow-md shadow-red-100 ring-2 ring-red-200"
                  : showCompatibility && isCompatible && activeType
                    ? `${colors.border} ${colors.bg} opacity-100`
                    : showCompatibility && activeType && !isCompatible
                      ? "border-slate-200 bg-slate-50 opacity-40"
                      : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50"
              )}
            >
              <Droplet
                className={cn(
                  "h-5 w-5 transition-colors",
                  isSelected
                    ? "fill-red-500 text-red-500"
                    : "fill-slate-200 text-slate-300"
                )}
              />
              <span
                className={cn(
                  "text-sm font-bold tracking-wide",
                  isSelected ? "text-red-700" : colors.text
                )}
              >
                {type}
              </span>
              {isSelected && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compatibility info */}
      {showCompatibility && activeType && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            {activeType} can receive from:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {compatibleTypes.map((ct) => {
              const colors = BLOOD_TYPE_COLORS[ct]!;
              return (
                <span
                  key={ct}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    colors.bg,
                    colors.text
                  )}
                >
                  <Droplet className="h-3 w-3 fill-current" />
                  {ct}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
