"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  MessageSquare,
  Phone,
  Video,
  Clock,
  ArrowRight,
} from "lucide-react";

interface ConsultationData {
  _id: string;
  type: "chat" | "voice" | "video";
  status: "waiting" | "active" | "ended";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  summary?: string;
  patientId?: {
    _id: string;
    userId?: string;
    user?: { name: string; avatar?: string };
  };
  doctorId?: {
    _id: string;
    userId?: string;
    specialization?: string;
    user?: { name: string; avatar?: string };
  };
  messages?: Array<{
    content: string;
    timestamp: string;
    senderId: unknown;
  }>;
}

interface ConsultationCardProps {
  consultation: ConsultationData;
  userRole: "admin" | "doctor" | "patient" | "security_officer";
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultationCard({
  consultation,
  userRole,
}: ConsultationCardProps) {
  const router = useRouter();

  const doctorName =
    consultation.doctorId?.user?.name || "Unknown Doctor";
  const patientName =
    consultation.patientId?.user?.name || "Unknown Patient";
  const displayName = userRole === "patient" ? `Dr. ${doctorName}` : patientName;
  const displayAvatar =
    userRole === "patient"
      ? consultation.doctorId?.user?.avatar
      : consultation.patientId?.user?.avatar;
  const displaySubtext =
    userRole === "patient"
      ? consultation.doctorId?.specialization || "Doctor"
      : "Patient";

  const TypeIcon =
    consultation.type === "video"
      ? Video
      : consultation.type === "voice"
        ? Phone
        : MessageSquare;
  const typeLabel =
    consultation.type === "video"
      ? "Video Call"
      : consultation.type === "voice"
        ? "Voice Call"
        : "Chat";
  const typeColor =
    consultation.type === "video"
      ? "text-purple-600"
      : consultation.type === "voice"
        ? "text-green-600"
        : "text-blue-600";
  const typeBg =
    consultation.type === "video"
      ? "bg-purple-50"
      : consultation.type === "voice"
        ? "bg-green-50"
        : "bg-blue-50";

  const isJoinable =
    consultation.status === "active" || consultation.status === "waiting";

  return (
    <div
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
      onClick={() => router.push(`/dashboard/consultations/${consultation._id}`)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar name={displayName} src={displayAvatar} size="md" />
          {consultation.status === "active" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </h4>
              <p className="text-xs text-slate-500">{displaySubtext}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={consultation.status} />
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {formatDateTime(consultation.createdAt)}
              </span>
            </div>
          </div>

          {/* Type badge + last message preview */}
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBg} ${typeColor}`}
            >
              <TypeIcon className="h-3 w-3" />
              {typeLabel}
            </span>
            {consultation.duration !== undefined &&
              consultation.status === "ended" && (
                <span className="text-[11px] text-slate-400">
                  {consultation.duration} min
                </span>
              )}
          </div>

          {/* Summary or last message preview */}
          {consultation.summary && consultation.status === "ended" && (
            <p className="mt-2 truncate text-xs text-slate-500">
              {consultation.summary}
            </p>
          )}
        </div>
      </div>

      {/* Join button for active consultations */}
      {isJoinable && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/consultations/${consultation._id}`);
            }}
          >
            {consultation.status === "waiting" ? "Join Consultation" : "Continue"}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
