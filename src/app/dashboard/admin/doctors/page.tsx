"use client";

import { useEffect, useState, useCallback } from "react";
import { Stethoscope, Search, Save, X, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils/helpers";

interface DoctorRow {
  _id: string;
  specialization: string;
  department: string;
  licenseNumber: string;
  experience: number;
  consultationFee: number;
  user?: { _id: string; name?: string; email?: string; avatar?: string } | null;
}

function doctorName(d: DoctorRow): string {
  return d.user?.name || d.user?.email || "Unknown doctor";
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftFee, setDraftFee] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/doctors?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDoctors(json.data as DoctorRow[]);
      } else {
        toast({
          type: "error",
          title: "Failed to load doctors",
          description: json.message,
        });
      }
    } catch {
      toast({ type: "error", title: "Network error" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(d: DoctorRow) {
    setEditingId(d._id);
    setDraftFee(String(d.consultationFee ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftFee("");
  }

  async function saveFee(d: DoctorRow) {
    const fee = Number(draftFee);
    if (!Number.isFinite(fee) || fee < 0) {
      toast({
        type: "error",
        title: "Invalid fee",
        description: "Enter a number of 0 or more.",
      });
      return;
    }

    setSavingId(d._id);
    try {
      const res = await fetch(`/api/doctors/${d._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationFee: fee }),
      });
      const json = await res.json();
      if (json.success) {
        setDoctors((prev) =>
          prev.map((row) =>
            row._id === d._id ? { ...row, consultationFee: fee } : row
          )
        );
        toast({
          type: "success",
          title: "Fee updated",
          description: `${doctorName(d)} → ${formatCurrency(fee)}`,
        });
        cancelEdit();
      } else {
        toast({
          type: "error",
          title: "Update failed",
          description: json.message,
        });
      }
    } catch {
      toast({ type: "error", title: "Network error" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-slate-700" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctors &amp; Pricing</h1>
          <p className="text-sm text-slate-500">
            Set the consultation fee charged for each doctor&apos;s appointments.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search by doctor name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            className="sm:max-w-xs"
          />
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Specialty</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3 text-right">Consultation Fee</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : doctors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No doctors found.
                    </td>
                  </tr>
                ) : (
                  doctors.map((d) => {
                    const isEditing = editingId === d._id;
                    const isSaving = savingId === d._id;
                    return (
                      <tr key={d._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {doctorName(d)}
                          {d.user?.email && (
                            <span className="block text-xs font-normal text-slate-400">
                              {d.user.email}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{d.specialization}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {d.licenseNumber}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-500">{CURRENCY_SYMBOL}</span>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                value={draftFee}
                                onChange={(e) => setDraftFee(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveFee(d);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                autoFocus
                                className="w-28 text-right"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(d.consultationFee)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="success"
                                loading={isSaving}
                                onClick={() => void saveFee(d)}
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isSaving}
                                onClick={cancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEdit(d)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit fee
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
