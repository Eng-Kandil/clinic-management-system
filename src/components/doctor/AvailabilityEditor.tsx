"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Clock, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/useToast";
import {
  DAY_LABELS,
  DEFAULT_AVAILABLE_SLOTS,
} from "@/lib/constants/availability";

// A single contiguous working range within a day.
interface TimeRange {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

// The flat shape stored on the Doctor model + accepted by PATCH /api/doctors/[id].
interface FlatSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Editor display order: Monday-first (clinic-friendly), Sunday last.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function groupByDay(slots: FlatSlot[]): Record<number, TimeRange[]> {
  const map: Record<number, TimeRange[]> = {};
  for (const s of slots) {
    (map[s.dayOfWeek] ??= []).push({
      startTime: s.startTime,
      endTime: s.endTime,
    });
  }
  for (const day of Object.keys(map)) {
    map[Number(day)]!.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return map;
}

function flatten(byDay: Record<number, TimeRange[]>): FlatSlot[] {
  const out: FlatSlot[] = [];
  for (const [day, ranges] of Object.entries(byDay)) {
    for (const r of ranges) {
      out.push({ dayOfWeek: Number(day), startTime: r.startTime, endTime: r.endTime });
    }
  }
  return out;
}

export default function AvailabilityEditor() {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [byDay, setByDay] = useState<Record<number, TimeRange[]>>({});
  const [remote, setRemote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedDefault, setUsedDefault] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/doctors/me");
        const json = await res.json();
        if (!active) return;
        if (!res.ok || !json.success) {
          setError(json.error || "Could not load your doctor profile.");
          setLoading(false);
          return;
        }
        const slots: FlatSlot[] = json.data?.availableSlots ?? [];
        setDoctorId(json.data?._id ?? null);
        setRemote(Boolean(json.data?.isAvailableForRemote));
        if (slots.length === 0) {
          // No schedule yet — start from the standard default so the doctor
          // has a sensible starting point they can then adjust.
          setByDay(groupByDay(DEFAULT_AVAILABLE_SLOTS));
          setUsedDefault(true);
        } else {
          setByDay(groupByDay(slots));
        }
        setLoading(false);
      } catch {
        if (!active) return;
        setError("Network error loading your profile.");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalRanges = useMemo(
    () => Object.values(byDay).reduce((n, r) => n + r.length, 0),
    [byDay]
  );

  const toggleDay = (day: number) => {
    setByDay((prev) => {
      const next = { ...prev };
      if (next[day]?.length) {
        delete next[day];
      } else {
        next[day] = [{ startTime: "09:00", endTime: "17:00" }];
      }
      return next;
    });
  };

  const addRange = (day: number) => {
    setByDay((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { startTime: "09:00", endTime: "17:00" }],
    }));
  };

  const removeRange = (day: number, idx: number) => {
    setByDay((prev) => {
      const ranges = (prev[day] ?? []).filter((_, i) => i !== idx);
      const next = { ...prev };
      if (ranges.length) next[day] = ranges;
      else delete next[day];
      return next;
    });
  };

  const updateRange = (
    day: number,
    idx: number,
    field: keyof TimeRange,
    value: string
  ) => {
    setByDay((prev) => {
      const ranges = [...(prev[day] ?? [])];
      ranges[idx] = { ...ranges[idx]!, [field]: value };
      return { ...prev, [day]: ranges };
    });
  };

  const resetToDefault = () => {
    setByDay(groupByDay(DEFAULT_AVAILABLE_SLOTS));
    setUsedDefault(false);
  };

  const validate = (): string | null => {
    for (const [day, ranges] of Object.entries(byDay)) {
      for (const r of ranges) {
        if (!r.startTime || !r.endTime) {
          return `${DAY_LABELS[Number(day)]}: both start and end times are required.`;
        }
        if (r.startTime >= r.endTime) {
          return `${DAY_LABELS[Number(day)]}: start time must be before end time.`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!doctorId) return;
    const validationError = validate();
    if (validationError) {
      toast({ type: "error", title: "Invalid schedule", description: validationError });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableSlots: flatten(byDay),
          isAvailableForRemote: remote,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUsedDefault(false);
        toast({ type: "success", title: "Availability saved" });
      } else {
        toast({
          type: "error",
          title: "Could not save",
          description: json.error || "Please check your schedule and try again.",
        });
      }
    } catch {
      toast({ type: "error", title: "Network error", description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your schedule…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-slate-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Remote consultations toggle */}
      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Video className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Available for remote consultations
            </p>
            <p className="text-xs text-slate-500">
              Allow patients to book video &amp; voice calls with you.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={remote}
          onClick={() => setRemote((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            remote ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              remote ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </Card>

      {usedDefault && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You haven&apos;t set a schedule yet, so we&apos;ve filled in the
          standard <strong>Mon–Fri, 09:00–17:00</strong> default. Adjust it as
          you like, then press <strong>Save</strong>.
        </div>
      )}

      {/* Weekly grid */}
      <Card className="divide-y divide-slate-100">
        {DISPLAY_ORDER.map((day) => {
          const ranges = byDay[day] ?? [];
          const enabled = ranges.length > 0;
          return (
            <div key={day} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggleDay(day)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      enabled ? "bg-green-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span
                    className={`w-24 text-sm font-medium ${
                      enabled ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </span>
                </div>
                {enabled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addRange(day)}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add hours
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">Day off</span>
                )}
              </div>

              {enabled && (
                <div className="mt-3 space-y-2 pl-12">
                  {ranges.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <input
                        type="time"
                        value={r.startTime}
                        onChange={(e) =>
                          updateRange(day, idx, "startTime", e.target.value)
                        }
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="time"
                        value={r.endTime}
                        onChange={(e) =>
                          updateRange(day, idx, "endTime", e.target.value)
                        }
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeRange(day, idx)}
                        className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            Reset to default
          </Button>
          <span className="text-xs text-slate-500">
            {totalRanges} time block{totalRanges === 1 ? "" : "s"} across the week
          </span>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" /> Save availability
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
