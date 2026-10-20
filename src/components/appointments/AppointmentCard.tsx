"use client";

import { Calendar, Clock, MapPin, Video, MoreVertical } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatClinicTime } from "@/lib/utils/datetime";

interface AppointmentCardProps {
  appointment: {
    _id: string;
    dateTime: string;
    endTime?: string;
    type: "in-person" | "remote";
    status: string;
    reason: string;
    doctorId?: { user?: { name: string }; specialization?: string };
    patientId?: { user?: { name: string } };
  };
  showPatient?: boolean;
  showDoctor?: boolean;
  onClick?: () => void;
}

export default function AppointmentCard({
  appointment,
  showPatient = false,
  showDoctor = true,
  onClick,
}: AppointmentCardProps) {
  const date = new Date(appointment.dateTime);

  return (
    <div
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Date Box */}
          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <span className="text-xs font-medium leading-none">
              {formatClinicTime(date, { month: "short" })}
            </span>
            <span className="text-lg font-bold leading-none mt-0.5">
              {formatClinicTime(date, { day: "numeric" })}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={appointment.status} />
              <span className="flex items-center gap-1 text-xs text-slate-400">
                {appointment.type === "remote" ? (
                  <Video className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                {appointment.type === "remote" ? "Remote" : "In-person"}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-900 truncate">
              {appointment.reason}
            </p>

            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatClinicTime(date, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatClinicTime(date, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {showDoctor && appointment.doctorId?.user?.name && (
              <p className="mt-1 text-xs text-slate-400">
                Dr. {appointment.doctorId.user.name}
                {appointment.doctorId.specialization && (
                  <span> - {appointment.doctorId.specialization}</span>
                )}
              </p>
            )}
            {showPatient && appointment.patientId?.user?.name && (
              <p className="mt-1 text-xs text-slate-400">
                Patient: {appointment.patientId.user.name}
              </p>
            )}
          </div>
        </div>

        <button
          className="rounded-md p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
