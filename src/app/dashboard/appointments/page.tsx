"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  List,
  CalendarDays,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Eye,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/shared/StatusBadge";
import { TableSkeleton } from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import CalendarView from "@/components/appointments/CalendarView";
import { formatClinicTime } from "@/lib/utils/datetime";

interface AppointmentRow {
  _id: string;
  dateTime: string;
  endTime?: string;
  type: "in-person" | "remote";
  status: string;
  reason: string;
  notes?: string;
  doctorId?: { _id: string; user?: { name: string }; specialization?: string };
  patientId?: { _id: string; user?: { name: string } };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "no-show" },
];

const TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "In Person", value: "in-person" },
  { label: "Remote", value: "remote" },
];

export default function AppointmentsPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchAppointments = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", view === "calendar" ? "200" : "10");
        if (statusFilter) params.set("status", statusFilter);
        if (typeFilter) params.set("type", typeFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/appointments?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setAppointments(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        } else {
          setAppointments([]);
        }
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter, dateFrom, dateTo, view]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchAppointments(1), 300);
    return () => clearTimeout(timeout);
  }, [fetchAppointments]);

  const clearFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage patient appointments and schedules
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/appointments/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* View Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-800"
            }`}
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "calendar"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-800"
            }`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-36"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="w-36"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="w-36"
          />
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "calendar" ? (
        loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <CalendarView
            appointments={appointments}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
            onSelectAppointment={(appt) => router.push(`/dashboard/appointments/${appt._id}`)}
          />
        )
      ) : loading ? (
        <TableSkeleton rows={5} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments found"
          description="No appointments match your current filters."
          action={{ label: "Book Appointment", href: "/dashboard/appointments/new" }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-6 py-3.5 font-medium text-slate-600">Date/Time</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Patient</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Doctor</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Type</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Status</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Reason</th>
                  <th className="px-6 py-3.5 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr
                    key={appt._id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/appointments/${appt._id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {formatClinicTime(appt.dateTime, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatClinicTime(appt.dateTime, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {appt.patientId?.user?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {appt.doctorId?.user?.name ? `Dr. ${appt.doctorId.user.name}` : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-600">
                        {appt.type === "remote" ? (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {appt.type === "remote" ? "Remote" : "In-person"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">
                      {appt.reason}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/appointments/${appt._id}`);
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {appt.status === "scheduled" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/appointments/${appt._id}?action=reschedule`);
                              }}
                              title="Reschedule"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/appointments/${appt._id}?action=cancel`);
                              }}
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4 text-red-400" />
                            </Button>
                          </>
                        )}
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
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => fetchAppointments(pagination.page - 1)}
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
                  onClick={() => fetchAppointments(pagination.page + 1)}
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
