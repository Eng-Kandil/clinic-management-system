"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";

interface PatientRow {
  _id: string;
  user: { _id: string; name: string; email: string; avatar?: string };
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  lastVisit?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const BLOOD_TYPE_OPTIONS = [
  { label: "All Blood Types", value: "" },
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchPatients = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");
      if (search) params.set("search", search);
      if (bloodTypeFilter) params.set("bloodType", bloodTypeFilter);

      const res = await fetch(`/api/patients?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setPatients(json.data || []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      } else {
        setPatients([]);
      }
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [search, bloodTypeFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPatients(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchPatients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and view patient records
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search patients by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-48">
          <Select
            options={BLOOD_TYPE_OPTIONS}
            value={bloodTypeFilter}
            onChange={(e) => setBloodTypeFilter(e.target.value)}
            placeholder="Blood Type"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setBloodTypeFilter("");
          }}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients found"
          description="No patients match your current filters. Try adjusting your search."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-6 py-3.5 font-medium text-slate-600">Name</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Email</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Blood Type</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Age</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Gender</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Last Visit</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient._id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/patients/${patient._id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                          {patient.user?.name?.charAt(0)?.toUpperCase() || "P"}
                        </div>
                        <span className="font-medium text-slate-900">
                          {patient.user?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {patient.user?.email || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {patient.bloodType ? (
                        <StatusBadge status={patient.bloodType} variant="info" />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {patient.dateOfBirth
                        ? calculateAge(patient.dateOfBirth)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 capitalize">
                      {patient.gender || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {patient.lastVisit
                        ? new Date(patient.lastVisit).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/patients/${patient._id}`);
                          }}
                          title="View Patient"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/emr/${patient._id}`);
                          }}
                          title="Medical Records"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} patients
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => fetchPatients(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => fetchPatients(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
