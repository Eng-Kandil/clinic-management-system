"use client";

import { useState, useCallback } from "react";
import {
  Brain,
  Sparkles,
  History,
  Activity,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SymptomInput from "@/components/ai-diagnosis/SymptomInput";
import DiagnosisResult from "@/components/ai-diagnosis/DiagnosisResult";
import DiagnosisHistory from "@/components/ai-diagnosis/DiagnosisHistory";
import type { HistoryFilters } from "@/components/ai-diagnosis/DiagnosisHistory";

// ── Types ────────────────────────────────────────────────────────────────────

interface DiagnosisResultData {
  conditions: Array<{
    name: string;
    probability: number;
    description: string;
  }>;
  recommendations: string[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  disclaimer: string;
}

interface DiagnosisRecord {
  _id: string;
  symptoms: string[];
  additionalInfo?: string;
  result: DiagnosisResultData;
  status: "pending" | "completed" | "reviewed" | "dismissed";
  doctorNotes?: string;
  createdAt: string;
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function AIDiagnosisPage() {
  // New Diagnosis state
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [historyData, setHistoryData] = useState<DiagnosisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── Run diagnosis ──────────────────────────────────────────────
  const runDiagnosis = useCallback(async () => {
    if (symptoms.length === 0) {
      setError("Please add at least one symptom.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        symptoms,
        additionalInfo: additionalInfo || undefined,
      };

      if (patientAge) {
        payload.patientAge = parseInt(patientAge, 10);
      }
      if (patientGender) {
        payload.patientGender = patientGender;
      }

      const res = await fetch("/api/ai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to run diagnosis. Please try again.");
        return;
      }

      setResult(data.data.result);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [symptoms, additionalInfo, patientAge, patientGender]);

  // ── Fetch history ──────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (filters?: HistoryFilters) => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (filters?.status) params.set("status", filters.status);
        if (filters?.urgencyLevel)
          params.set("urgencyLevel", filters.urgencyLevel);
        if (filters?.dateFrom)
          params.set("dateFrom", new Date(filters.dateFrom).toISOString());
        if (filters?.dateTo)
          params.set("dateTo", new Date(filters.dateTo).toISOString());

        const res = await fetch(
          `/api/ai-diagnosis/history?${params.toString()}`
        );
        const data = await res.json();

        if (res.ok) {
          setHistoryData(data.data || []);
        }
      } catch {
        // Silently fail — history is supplementary
      } finally {
        setHistoryLoading(false);
        setHistoryLoaded(true);
      }
    },
    []
  );

  // ── Reset form ─────────────────────────────────────────────────
  const resetForm = () => {
    setSymptoms([]);
    setAdditionalInfo("");
    setPatientAge("");
    setPatientGender("");
    setResult(null);
    setError(null);
  };

  // ── Tab change handler ─────────────────────────────────────────
  const handleTabChange = (value: string) => {
    if (value === "history" && !historyLoaded) {
      fetchHistory();
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                AI Diagnosis
              </h1>
              <p className="text-sm text-slate-500">
                Describe your symptoms and let AI analyze possible conditions
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          AI Ready
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="new"
        onChange={handleTabChange}
        tabs={[
          {
            label: "New Diagnosis",
            value: "new",
            content: (
              <div className="space-y-6">
                {/* ── Analysis form ──────────────────────────────── */}
                {!result && (
                  <div className="space-y-6">
                    {/* Symptoms input card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4">
                        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                          <Activity className="h-5 w-5 text-blue-600" />
                          Describe Your Symptoms
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Add your symptoms by typing or selecting from common
                          suggestions below.
                        </p>
                      </div>
                      <SymptomInput
                        symptoms={symptoms}
                        onChange={setSymptoms}
                        disabled={isAnalyzing}
                      />
                    </div>

                    {/* Optional details card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-base font-semibold text-slate-900">
                        Additional Details
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (Optional)
                        </span>
                      </h3>

                      <div className="space-y-4">
                        <Textarea
                          label="Additional Information"
                          placeholder="Describe your symptoms in more detail, when they started, severity, any relevant medical history..."
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          disabled={isAnalyzing}
                          className="min-h-[100px]"
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                              Age
                            </label>
                            <input
                              type="number"
                              placeholder="e.g., 35"
                              value={patientAge}
                              onChange={(e) => setPatientAge(e.target.value)}
                              disabled={isAnalyzing}
                              min={0}
                              max={150}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                              Gender
                            </label>
                            <select
                              value={patientGender}
                              onChange={(e) =>
                                setPatientGender(e.target.value)
                              }
                              disabled={isAnalyzing}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Select...</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                              <option value="prefer_not_to_say">
                                Prefer not to say
                              </option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            Unable to run diagnosis
                          </p>
                          <p className="mt-0.5 text-sm text-red-600">
                            {error}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Analyze button */}
                    {!isAnalyzing ? (
                      <Button
                        onClick={runDiagnosis}
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700"
                        disabled={symptoms.length === 0}
                      >
                        <Sparkles className="h-5 w-5" />
                        Analyze Symptoms
                      </Button>
                    ) : (
                      /* Loading state */
                      <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white px-6 py-12">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-full border-4 border-blue-100">
                            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        <h3 className="mt-6 text-base font-semibold text-slate-900">
                          AI is analyzing your symptoms...
                        </h3>
                        <p className="mt-1.5 text-sm text-slate-500">
                          This usually takes a few seconds
                        </p>
                        <div className="mt-4 flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          <span className="text-xs text-blue-600 font-medium">
                            Processing {symptoms.length} symptom
                            {symptoms.length !== 1 && "s"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Results ────────────────────────────────────── */}
                {result && (
                  <div className="space-y-4">
                    {/* Back / new diagnosis button */}
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        Analysis Results
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetForm}
                      >
                        New Diagnosis
                      </Button>
                    </div>

                    {/* Symptoms recap */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Analyzed Symptoms
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {symptoms.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <DiagnosisResult
                      result={result}
                      onBookAppointment={() => {
                        window.location.href = "/dashboard/appointments";
                      }}
                      onSaveAndShare={() => {
                        // Diagnosis is already saved to DB via POST.
                        // Could open a share dialog in the future.
                        alert(
                          "Diagnosis saved! Share with your doctor during your next appointment."
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            ),
          },
          {
            label: "History",
            value: "history",
            content: (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Diagnosis History
                  </h3>
                </div>
                <DiagnosisHistory
                  diagnoses={historyData}
                  isLoading={historyLoading}
                  onFilterChange={(filters) => fetchHistory(filters)}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
