"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check, PanelLeftClose, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/hooks/useToast";

// ─── Types ───────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";

interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    description: "Classic light interface",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Easier on the eyes",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Follows your OS setting",
    icon: Monitor,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState("en");
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load from localStorage ──────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appearance-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Hydrating state from localStorage on mount is intentional one-time sync.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.compactSidebar !== undefined)
          setCompactSidebar(parsed.compactSidebar);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // ── Save ────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));

    localStorage.setItem(
      "appearance-settings",
      JSON.stringify({ theme, language, compactSidebar })
    );

    setSaving(false);
    toast({
      type: "success",
      title: "Appearance saved",
      description: "Your appearance preferences have been updated.",
    });
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Theme ─────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-semibold text-slate-900">Theme</h3>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Select the appearance theme for the application.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                  isActive
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="text-center">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? "text-blue-700" : "text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {theme === "dark" && (
          <p className="mt-3 text-xs text-slate-500">
            Note: Dark mode styling is not yet applied. This preference will be
            used when dark mode support is added.
          </p>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* ── Language ──────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">Language</h3>
        </div>

        <div className="max-w-xs">
          <Select
            options={[
              { label: "English (US)", value: "en" },
              { label: "Spanish (coming soon)", value: "es", disabled: true },
              { label: "French (coming soon)", value: "fr", disabled: true },
              { label: "Arabic (coming soon)", value: "ar", disabled: true },
            ]}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* ── Sidebar compact ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <PanelLeftClose className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Compact Sidebar
              </p>
              <p className="text-xs text-slate-500">
                Reduce sidebar width to show only icons
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={compactSidebar}
            onClick={() => setCompactSidebar(!compactSidebar)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              compactSidebar ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                compactSidebar ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

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
