"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/helpers";
import { getBloodTypeCompatibility } from "@/lib/utils/helpers";
import { Droplet, ArrowRight, Info } from "lucide-react";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;

const TYPE_COLORS: Record<string, string> = {
  "O-": "bg-red-600",
  "O+": "bg-red-500",
  "A-": "bg-rose-600",
  "A+": "bg-rose-500",
  "B-": "bg-orange-600",
  "B+": "bg-orange-500",
  "AB-": "bg-purple-600",
  "AB+": "bg-purple-500",
};

const TYPE_LIGHT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "O-": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "O+": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "A-": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "A+": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "B-": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "B+": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "AB-": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "AB+": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

export default function CompatibilityChart() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [mode, setMode] = useState<"receive" | "donate">("receive");

  // "Receive from" = getBloodTypeCompatibility(selected) => which types can donate TO selected
  // "Donate to" = for each blood type, check if selected is in its compatibility list
  function getCanDonateTo(donorType: string): string[] {
    return BLOOD_TYPES.filter((recipientType) => {
      const compatible = getBloodTypeCompatibility(recipientType);
      return compatible.includes(donorType);
    });
  }

  const highlightedTypes = selectedType
    ? mode === "receive"
      ? getBloodTypeCompatibility(selectedType)
      : getCanDonateTo(selectedType)
    : [];

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setMode("receive")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "receive"
              ? "bg-red-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          Can Receive From
        </button>
        <button
          type="button"
          onClick={() => setMode("donate")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            mode === "donate"
              ? "bg-red-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          Can Donate To
        </button>
      </div>

      {/* Info text */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
        <Info className="h-4 w-4" />
        <span>Click a blood type to see compatibility</span>
      </div>

      {/* Blood type grid */}
      <div className="grid grid-cols-4 gap-3">
        {BLOOD_TYPES.map((type) => {
          const isSelected = selectedType === type;
          const isHighlighted = highlightedTypes.includes(type);
          const lightColors = TYPE_LIGHT_COLORS[type]!;

          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                setSelectedType(selectedType === type ? null : type)
              }
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                isSelected
                  ? "border-red-500 bg-red-50 shadow-lg shadow-red-100 scale-105"
                  : selectedType && isHighlighted
                    ? `${lightColors.border} ${lightColors.bg} shadow-sm`
                    : selectedType && !isHighlighted
                      ? "border-slate-100 bg-slate-50 opacity-30"
                      : "border-slate-200 bg-white hover:border-red-200 hover:shadow-sm"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isSelected || (selectedType && isHighlighted)
                    ? TYPE_COLORS[type]
                    : "bg-slate-200"
                )}
              >
                <Droplet
                  className={cn(
                    "h-5 w-5",
                    isSelected || (selectedType && isHighlighted)
                      ? "fill-white text-white"
                      : "fill-slate-400 text-slate-400"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-bold",
                  isSelected
                    ? "text-red-700"
                    : selectedType && isHighlighted
                      ? lightColors.text
                      : "text-slate-700"
                )}
              >
                {type}
              </span>
              {isSelected && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 shadow-sm">
                  <Droplet className="h-3.5 w-3.5 fill-white text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compatibility details panel */}
      {selectedType && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-red-50/30 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                TYPE_COLORS[selectedType]
              )}
            >
              <Droplet className="h-6 w-6 fill-white text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">
                Blood Type {selectedType}
              </h4>
              <p className="text-sm text-slate-500">
                {mode === "receive"
                  ? `Can receive blood from ${highlightedTypes.length} type(s)`
                  : `Can donate blood to ${highlightedTypes.length} type(s)`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
                TYPE_LIGHT_COLORS[selectedType]!.bg,
                TYPE_LIGHT_COLORS[selectedType]!.text
              )}
            >
              <Droplet className="h-3.5 w-3.5 fill-current" />
              {selectedType}
            </span>

            <ArrowRight className="h-4 w-4 text-slate-400" />

            <span className="text-sm text-slate-500 mr-1">
              {mode === "receive" ? "receives from" : "donates to"}
            </span>

            {highlightedTypes.map((ht) => {
              const lc = TYPE_LIGHT_COLORS[ht]!;
              return (
                <span
                  key={ht}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    lc.bg,
                    lc.text
                  )}
                >
                  <Droplet className="h-3 w-3 fill-current" />
                  {ht}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Universal donor / recipient note */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600">
            <Droplet className="h-4 w-4 fill-white text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">
              Universal Donor
            </p>
            <p className="text-xs text-red-600">
              O- can donate red blood cells to anyone
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50/50 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600">
            <Droplet className="h-4 w-4 fill-white text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800">
              Universal Recipient
            </p>
            <p className="text-xs text-purple-600">
              AB+ can receive red blood cells from anyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
