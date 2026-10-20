"use client";

import { cn } from "@/lib/utils/helpers";
import {
  Droplet,
  MapPin,
  Clock,
  AlertTriangle,
  AlertCircle,
  Users,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RespondedDonor {
  donorId: {
    _id?: string;
    userId?: { name?: string };
    bloodType?: string;
  } | string;
  status: "pending" | "accepted" | "declined" | "donated";
  respondedAt: string;
}

interface BloodRequestCardProps {
  request: {
    _id: string;
    bloodType: string;
    unitsNeeded: number;
    urgency: "routine" | "urgent" | "emergency";
    status: "open" | "partially_fulfilled" | "fulfilled" | "cancelled";
    hospital: string;
    deadline?: string;
    requestedBy?: { _id?: string; name?: string; email?: string } | string;
    respondedDonors?: RespondedDonor[];
    unitsFulfilled?: number;
    notes?: string;
    createdAt: string;
  };
  isOwner?: boolean;
  isDonor?: boolean;
  donorStatus?: "pending" | "accepted" | "declined" | "donated" | null;
  onRespond?: (requestId: string) => void;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

const BLOOD_TYPE_BADGE_COLORS: Record<string, string> = {
  "O-": "bg-red-600 text-white",
  "O+": "bg-red-500 text-white",
  "A-": "bg-rose-600 text-white",
  "A+": "bg-rose-500 text-white",
  "B-": "bg-orange-600 text-white",
  "B+": "bg-orange-500 text-white",
  "AB-": "bg-purple-600 text-white",
  "AB+": "bg-purple-500 text-white",
};

const URGENCY_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof AlertCircle }
> = {
  routine: {
    label: "Routine",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  urgent: {
    label: "Urgent",
    color: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
  emergency: {
    label: "Emergency",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  partially_fulfilled: {
    label: "Partially Fulfilled",
    color: "bg-amber-100 text-amber-700",
  },
  fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500" },
};

function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff < 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m remaining`;
}

export default function BloodRequestCard({
  request,
  isOwner = false,
  isDonor = false,
  donorStatus,
  onRespond,
  onViewDetails,
  className,
}: BloodRequestCardProps) {
  const urgencyConfig = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.routine!;
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.open!;
  const UrgencyIcon = urgencyConfig.icon;

  const acceptedCount =
    request.respondedDonors?.filter(
      (d) => d.status === "accepted" || d.status === "donated"
    ).length || 0;
  const totalMatched = request.respondedDonors?.length || 0;

  const requesterName =
    typeof request.requestedBy === "object" && request.requestedBy?.name
      ? request.requestedBy.name
      : "Unknown";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:shadow-md",
        request.urgency === "emergency"
          ? "border-red-200 hover:border-red-300"
          : request.urgency === "urgent"
            ? "border-amber-200 hover:border-amber-300"
            : "border-slate-200 hover:border-slate-300",
        className
      )}
    >
      {/* Urgency stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          request.urgency === "emergency"
            ? "bg-red-500"
            : request.urgency === "urgent"
              ? "bg-amber-500"
              : "bg-green-500"
        )}
      />

      <div className="p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Blood type badge */}
            <div
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center rounded-xl",
                BLOOD_TYPE_BADGE_COLORS[request.bloodType] || "bg-slate-600 text-white"
              )}
            >
              <Droplet className="h-4 w-4 fill-current" />
              <span className="text-sm font-bold leading-tight">
                {request.bloodType}
              </span>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {request.unitsNeeded} unit{request.unitsNeeded > 1 ? "s" : ""}{" "}
                needed
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {request.hospital}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                urgencyConfig.color
              )}
            >
              <UrgencyIcon className="h-3 w-3" />
              {urgencyConfig.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusConfig.color
              )}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Details row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          {request.deadline && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span
                className={cn(
                  getTimeRemaining(request.deadline) === "Expired"
                    ? "text-red-600 font-medium"
                    : ""
                )}
              >
                {getTimeRemaining(request.deadline)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>
              {acceptedCount}/{request.unitsNeeded} accepted
              {totalMatched > 0 && (
                <span className="text-slate-400">
                  {" "}
                  ({totalMatched} matched)
                </span>
              )}
            </span>
          </div>

          {!isOwner && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">by</span>
              <span className="font-medium text-slate-600">
                {requesterName}
              </span>
            </div>
          )}
        </div>

        {/* Notes preview */}
        {request.notes && (
          <p className="mt-2.5 text-sm text-slate-500 line-clamp-2">
            {request.notes}
          </p>
        )}

        {/* Progress bar for fulfillment */}
        {request.status !== "cancelled" && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Fulfillment progress</span>
              <span className="font-medium">
                {request.unitsFulfilled || 0}/{request.unitsNeeded} units
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  request.status === "fulfilled"
                    ? "bg-green-500"
                    : "bg-red-500"
                )}
                style={{
                  width: `${Math.min(
                    ((request.unitsFulfilled || 0) / request.unitsNeeded) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2">
          {isDonor &&
            request.status === "open" &&
            donorStatus !== "accepted" &&
            donorStatus !== "donated" && (
              <Button
                size="sm"
                onClick={() => onRespond?.(request._id)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Droplet className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Respond to Donate
              </Button>
            )}

          {isDonor && donorStatus === "accepted" && (
            <Badge variant="success" className="px-3 py-1">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              You Accepted
            </Badge>
          )}

          {isDonor && donorStatus === "declined" && (
            <Badge variant="default" className="px-3 py-1 bg-slate-100 text-slate-500">
              Declined
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails?.(request._id)}
            className="ml-auto text-slate-500 hover:text-slate-700"
          >
            Details
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
