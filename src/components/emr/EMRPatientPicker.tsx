"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Droplets, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PatientUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface PatientResult {
  _id: string;
  user: PatientUser;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
}

export default function EMRPatientPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/patients?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPatients(json.data || []);
      } else {
        setError(json.message || "Failed to load patients");
        setPatients([]);
      }
    } catch {
      setError("An unexpected error occurred");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Input
          placeholder="Search patients by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-slate-200 bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <User className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">
            {query ? "No patients found" : "No patients available"}
          </p>
          {query && (
            <p className="mt-1 text-xs text-slate-400">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <button
              key={patient._id}
              type="button"
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              onClick={() => router.push(`/dashboard/emr/${patient._id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  {patient.user?.name?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {patient.user?.name || "Unknown"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {patient.user?.email}
                    </span>
                    {patient.bloodType && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Droplets className="h-3 w-3 text-red-400" />
                        {patient.bloodType}
                      </span>
                    )}
                    {patient.gender && (
                      <span className="text-xs text-slate-500 capitalize">
                        {patient.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
