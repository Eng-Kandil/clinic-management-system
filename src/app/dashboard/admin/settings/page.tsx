"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/useToast";

interface FlagsState {
  aiEnabled: boolean;
  registrationOpen: boolean;
  maintenanceMode: boolean;
}

const DEFAULT_FLAGS: FlagsState = {
  aiEnabled: true,
  registrationOpen: true,
  maintenanceMode: false,
};

const FLAG_META: Array<{
  key: keyof FlagsState;
  label: string;
  description: string;
  danger?: boolean;
}> = [
  {
    key: "aiEnabled",
    label: "AI Features",
    description: "Globally enable AI diagnosis, symptom checking and chat features.",
  },
  {
    key: "registrationOpen",
    label: "Open Registration",
    description: "Allow new patients to create accounts.",
  },
  {
    key: "maintenanceMode",
    label: "Maintenance Mode",
    description: "Block non-admin access while you perform updates.",
    danger: true,
  },
];

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<FlagsState>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadFlags();
  }, []);

  async function loadFlags() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success) {
        setFlags({
          aiEnabled: !!json.data.aiEnabled,
          registrationOpen: !!json.data.registrationOpen,
          maintenanceMode: !!json.data.maintenanceMode,
        });
      } else {
        toast({ type: "error", title: "Failed to load settings", description: json.message });
      }
    } catch {
      toast({ type: "error", title: "Network error", description: "Could not reach the server." });
    } finally {
      setLoading(false);
    }
  }

  function toggle(key: keyof FlagsState) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flags),
      });
      const json = await res.json();
      if (json.success) {
        toast({ type: "success", title: "Settings saved" });
      } else {
        toast({ type: "error", title: "Save failed", description: json.message });
      }
    } catch {
      toast({ type: "error", title: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-slate-700" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Global feature flags and operational toggles.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Changes apply immediately for all users. All changes are audit-logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            FLAG_META.map((meta) => (
              <div
                key={meta.key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  {meta.danger && (
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{meta.label}</p>
                    <p className="text-xs text-slate-500">{meta.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flags[meta.key]}
                  onClick={() => toggle(meta.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    flags[meta.key]
                      ? meta.danger
                        ? "bg-amber-600"
                        : "bg-blue-600"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      flags[meta.key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))
          )}

          <div className="border-t border-slate-200 pt-4">
            <Button onClick={handleSave} loading={saving} disabled={loading}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
