"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Zap,
  ShieldAlert,
  CalendarPlus,
  Share2,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Condition {
  name: string;
  probability: number;
  description: string;
}

interface DiagnosisResultData {
  conditions: Condition[];
  recommendations: string[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  disclaimer: string;
}

interface DiagnosisResultProps {
  result: DiagnosisResultData;
  onBookAppointment?: () => void;
  onSaveAndShare?: () => void;
}

// ── Urgency config ───────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  low: {
    label: "Low Urgency",
    icon: CheckCircle,
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    iconColor: "text-green-600",
    barColor: "bg-green-500",
    badgeVariant: "success" as const,
    description: "Your symptoms appear mild. Monitor and consult if persistent.",
  },
  medium: {
    label: "Medium Urgency",
    icon: AlertCircle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    iconColor: "text-amber-600",
    barColor: "bg-amber-500",
    badgeVariant: "warning" as const,
    description: "Consider scheduling a medical appointment within the week.",
  },
  high: {
    label: "High Urgency",
    icon: AlertTriangle,
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    iconColor: "text-orange-600",
    barColor: "bg-orange-500",
    badgeVariant: "warning" as const,
    description: "Please seek medical attention within 24-48 hours.",
  },
  emergency: {
    label: "Emergency",
    icon: Zap,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    iconColor: "text-red-600",
    barColor: "bg-red-600",
    badgeVariant: "danger" as const,
    description:
      "Seek immediate medical attention. Call emergency services if needed.",
  },
};

// ── Probability Bar (animated) ───────────────────────────────────────────────

function ProbabilityBar({
  probability,
  color,
  delay,
}: {
  probability: number;
  color: string;
  delay: number;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(probability * 100);
    }, delay);
    return () => clearTimeout(timer);
  }, [probability, delay]);

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-1000 ease-out",
          color
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DiagnosisResult({
  result,
  onBookAppointment,
  onSaveAndShare,
}: DiagnosisResultProps) {
  const urgency = URGENCY_CONFIG[result.urgencyLevel];
  const UrgencyIcon = urgency.icon;
  const [expandedCondition, setExpandedCondition] = useState<number | null>(0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Urgency Banner ──────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-start gap-4 rounded-xl border p-5",
          urgency.bg,
          urgency.border
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            urgency.bg
          )}
        >
          <UrgencyIcon className={cn("h-6 w-6", urgency.iconColor)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-lg font-semibold", urgency.text)}>
              {urgency.label}
            </h3>
            <Badge variant={urgency.badgeVariant} className="text-xs">
              {result.urgencyLevel.toUpperCase()}
            </Badge>
          </div>
          <p className={cn("mt-1 text-sm", urgency.text, "opacity-80")}>
            {urgency.description}
          </p>
        </div>
      </div>

      {/* ── Conditions List ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ListChecks className="h-5 w-5 text-blue-600" />
            Possible Conditions
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Ranked by likelihood based on your symptoms
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {result.conditions.map((condition, index) => {
            const isExpanded = expandedCondition === index;
            const percentage = Math.round(condition.probability * 100);

            return (
              <div
                key={condition.name}
                className="transition-colors hover:bg-slate-50/50"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCondition(isExpanded ? null : index)
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  {/* Rank number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    {index + 1}
                  </div>

                  {/* Condition info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {condition.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            percentage >= 60
                              ? "text-orange-600"
                              : percentage >= 35
                              ? "text-amber-600"
                              : "text-slate-500"
                          )}
                        >
                          {percentage}%
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProbabilityBar
                        probability={condition.probability}
                        color={
                          percentage >= 60
                            ? "bg-orange-500"
                            : percentage >= 35
                            ? "bg-amber-400"
                            : "bg-slate-300"
                        }
                        delay={200 + index * 150}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded description */}
                {isExpanded && (
                  <div className="px-5 pb-4 pl-[4.5rem] animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {condition.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recommendations ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Recommendations
          </h4>
        </div>
        <div className="px-5 py-4">
          <ol className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-700">
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Medical Disclaimer
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              {result.disclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {onBookAppointment && (
          <Button
            onClick={onBookAppointment}
            className="flex-1"
            size="lg"
          >
            <CalendarPlus className="h-4 w-4" />
            Book Appointment
          </Button>
        )}
        {onSaveAndShare && (
          <Button
            onClick={onSaveAndShare}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <Share2 className="h-4 w-4" />
            Save &amp; Share with Doctor
          </Button>
        )}
      </div>
    </div>
  );
}
