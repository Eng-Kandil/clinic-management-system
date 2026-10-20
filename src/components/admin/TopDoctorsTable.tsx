"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ChevronUp, ChevronDown, Stethoscope } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopDoctor {
  _id: string;
  name: string;
  avatar?: string;
  specialization: string;
  department: string;
  consultationFee: number;
  experience: number;
  totalAppointments: number;
  completedAppointments: number;
  estimatedRevenue: number;
}

interface TopDoctorsTableProps {
  doctors: TopDoctor[];
  loading?: boolean;
}

type SortField = "totalAppointments" | "completedAppointments" | "estimatedRevenue" | "experience";

// ---------------------------------------------------------------------------
// SortIcon (hoisted to avoid defining a component during render)
// ---------------------------------------------------------------------------

function SortIcon({
  field,
  sortField,
  sortOrder,
}: {
  field: SortField;
  sortField: SortField;
  sortOrder: "asc" | "desc";
}) {
  if (sortField !== field) return null;
  return sortOrder === "asc" ? (
    <ChevronUp className="ml-0.5 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-0.5 inline h-3 w-3" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TopDoctorsTable({
  doctors,
  loading = false,
}: TopDoctorsTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalAppointments");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  const sorted = [...doctors].sort((a, b) => {
    const mult = sortOrder === "asc" ? 1 : -1;
    return (a[sortField] - b[sortField]) * mult;
  });

  // Estimate a mock rating from completion ratio (real app would store ratings)
  function getEstimatedRating(doctor: TopDoctor): number {
    if (doctor.totalAppointments === 0) return 0;
    const ratio = doctor.completedAppointments / doctor.totalAppointments;
    return Math.min(5, Math.max(0, Math.round(ratio * 5 * 10) / 10));
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-500" />
          <CardTitle>Top Doctors</CardTitle>
        </div>
        <CardDescription>Ranked by performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No doctor data available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    #
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Doctor
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Specialization
                  </th>
                  <th
                    className="cursor-pointer whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    onClick={() => handleSort("totalAppointments")}
                  >
                    Appointments <SortIcon field="totalAppointments" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                  <th className="whitespace-nowrap pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Rating
                  </th>
                  <th
                    className="cursor-pointer whitespace-nowrap pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    onClick={() => handleSort("estimatedRevenue")}
                  >
                    Revenue <SortIcon field="estimatedRevenue" sortField={sortField} sortOrder={sortOrder} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.slice(0, 10).map((doctor, index) => {
                  const rating = getEstimatedRating(doctor);
                  return (
                    <tr key={doctor._id} className="hover:bg-slate-50 transition-colors">
                      {/* Rank */}
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                                ? "bg-slate-200 text-slate-600"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      {/* Doctor */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={doctor.avatar}
                            name={doctor.name ?? "Doctor"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {doctor.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {doctor.experience} yrs exp
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Specialization */}
                      <td className="whitespace-nowrap py-3 pr-4 text-sm text-slate-600">
                        {doctor.specialization}
                      </td>

                      {/* Appointments */}
                      <td className="py-3 pr-4">
                        <div>
                          <span className="text-sm font-medium text-slate-900">
                            {doctor.totalAppointments}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">
                            ({doctor.completedAppointments} done)
                          </span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= Math.round(rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs text-slate-500">
                            {rating.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="whitespace-nowrap py-3 text-sm font-medium text-emerald-700">
                        {formatCurrency(doctor.estimatedRevenue, { decimals: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
