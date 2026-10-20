"use client";

import { useState } from "react";
import {
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  Brain,
  Droplets,
  CreditCard,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/hooks/useToast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  color: string;
  bgColor: string;
  enabled: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const [saving, setSaving] = useState(false);
  const [frequency, setFrequency] = useState("realtime");
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "email",
      label: "Email Notifications",
      description: "Receive important updates via email",
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      enabled: true,
    },
    {
      id: "sms",
      label: "SMS Notifications",
      description: "Get text messages for urgent updates",
      icon: MessageSquare,
      color: "text-green-600",
      bgColor: "bg-green-100",
      enabled: false,
    },
    {
      id: "appointments",
      label: "Appointment Reminders",
      description: "Reminders before scheduled appointments",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      enabled: true,
    },
    {
      id: "ai_diagnosis",
      label: "AI Diagnosis Results",
      description: "Notifications when AI analysis is complete",
      icon: Brain,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      enabled: true,
    },
    {
      id: "blood_bridge",
      label: "Blood Bridge Alerts",
      description: "Urgent blood donation requests in your area",
      icon: Droplets,
      color: "text-red-600",
      bgColor: "bg-red-100",
      enabled: true,
    },
    {
      id: "billing",
      label: "Billing Reminders",
      description: "Invoice and payment due date reminders",
      icon: CreditCard,
      color: "text-slate-600",
      bgColor: "bg-slate-100",
      enabled: false,
    },
  ]);

  // ── Toggle a preference ─────────────────────────────────────────────

  function togglePreference(id: string) {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }

  // ── Save (mock) ─────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);

    // Save to localStorage as a simple persistence layer
    const prefs = {
      frequency,
      preferences: preferences.reduce(
        (acc, p) => {
          acc[p.id] = p.enabled;
          return acc;
        },
        {} as Record<string, boolean>
      ),
    };
    localStorage.setItem("notification-preferences", JSON.stringify(prefs));

    toast({
      type: "success",
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    });
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Notification Channels
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose which notifications you want to receive and how.
        </p>
      </div>

      {/* Notification toggles */}
      <div className="space-y-3">
        {preferences.map((pref) => {
          const Icon = pref.icon;
          return (
            <div
              key={pref.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${pref.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${pref.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {pref.label}
                  </p>
                  <p className="text-xs text-slate-500">{pref.description}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pref.enabled}
                onClick={() => togglePreference(pref.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  pref.enabled ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    pref.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <hr className="border-slate-200" />

      {/* Frequency */}
      <div>
        <h3 className="mb-1 text-base font-semibold text-slate-900">
          Notification Frequency
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          How often would you like to receive notification digests?
        </p>

        <div className="max-w-xs">
          <Select
            options={[
              { label: "Real-time", value: "realtime" },
              { label: "Daily Digest", value: "daily" },
              { label: "Weekly Summary", value: "weekly" },
            ]}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          />
        </div>
      </div>

      {/* Save */}
      <div className="border-t border-slate-200 pt-6">
        <Button onClick={handleSave} loading={saving}>
          {saving ? (
            "Saving..."
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
