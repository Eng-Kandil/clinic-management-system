"use client";

import { cn } from "@/lib/utils/helpers";
import {
  Droplet,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Heart,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MatchedRequest {
  _id: string;
  bloodType: string;
  hospital: string;
  urgency: string;
  status: string;
  unitsNeeded: number;
  deadline?: string;
  donorStatus?: "pending" | "accepted" | "declined" | "donated";
}

interface DonorActivityProps {
  donor: {
    _id: string;
    bloodType: string;
    isAvailable: boolean;
    lastDonationDate?: string;
    nextEligibleDate?: string;
    donationCount: number;
    healthConditions?: string[];
  } | null;
  matchedRequests: MatchedRequest[];
  onRespondToRequest?: (requestId: string) => void;
  onViewRequest?: (requestId: string) => void;
  loading?: boolean;
}

function getTimeUntilEligible(nextDate: string): string {
  const now = new Date();
  const eligible = new Date(nextDate);
  const diff = eligible.getTime() - now.getTime();
  if (diff <= 0) return "Eligible now";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? "s" : ""} remaining`;
}

const URGENCY_COLORS: Record<string, string> = {
  routine: "bg-green-100 text-green-700",
  urgent: "bg-amber-100 text-amber-700",
  emergency: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  pending: Clock,
  accepted: CheckCircle2,
  declined: XCircle,
  donated: Heart,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-blue-600 bg-blue-50",
  accepted: "text-green-600 bg-green-50",
  declined: "text-slate-400 bg-slate-50",
  donated: "text-red-600 bg-red-50",
};

export default function DonorActivity({
  donor,
  matchedRequests,
  onRespondToRequest,
  onViewRequest,
  loading = false,
}: DonorActivityProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-400">
          <Droplet className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Not Registered as Donor
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">
          Register as a blood donor to track your activity and respond to blood
          requests.
        </p>
      </div>
    );
  }

  const isEligible = donor.nextEligibleDate
    ? new Date(donor.nextEligibleDate) <= new Date()
    : true;

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Droplet className="h-5 w-5 text-red-600 fill-red-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {donor.bloodType}
          </p>
          <p className="text-xs text-slate-500">Blood Type</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Heart className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {donor.donationCount}
          </p>
          <p className="text-xs text-slate-500">Donations</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div
            className={cn(
              "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full",
              isEligible ? "bg-green-100" : "bg-amber-100"
            )}
          >
            <CheckCircle2
              className={cn(
                "h-5 w-5",
                isEligible ? "text-green-600" : "text-amber-600"
              )}
            />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {isEligible ? "Eligible" : "Not Yet"}
          </p>
          <p className="text-xs text-slate-500">Status</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div
            className={cn(
              "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full",
              donor.isAvailable ? "bg-green-100" : "bg-slate-100"
            )}
          >
            <Activity
              className={cn(
                "h-5 w-5",
                donor.isAvailable ? "text-green-600" : "text-slate-400"
              )}
            />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {donor.isAvailable ? "Available" : "Unavailable"}
          </p>
          <p className="text-xs text-slate-500">Availability</p>
        </div>
      </div>

      {/* Next eligible date */}
      {donor.nextEligibleDate && !isEligible && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Calendar className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Next Eligible Date
            </p>
            <p className="text-xs text-amber-600">
              {new Date(donor.nextEligibleDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              ({getTimeUntilEligible(donor.nextEligibleDate)})
            </p>
          </div>
        </div>
      )}

      {/* Matched requests needing response */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Matched Requests
          {matchedRequests.filter((r) => r.donorStatus === "pending").length >
            0 && (
            <Badge variant="danger" className="ml-1">
              {
                matchedRequests.filter((r) => r.donorStatus === "pending")
                  .length
              }{" "}
              pending
            </Badge>
          )}
        </h3>

        {matchedRequests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">
              No matched requests at the moment. You&apos;ll be notified when a
              compatible request is made.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {matchedRequests.map((req) => {
              const StatusIcon =
                STATUS_ICON[req.donorStatus || "pending"] || Clock;
              const statusColor =
                STATUS_COLOR[req.donorStatus || "pending"] ||
                STATUS_COLOR.pending;

              return (
                <div
                  key={req._id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  {/* Status icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      statusColor
                    )}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {req.bloodType}
                      </span>
                      <span className="text-xs text-slate-400">&middot;</span>
                      <span className="text-sm text-slate-600 truncate">
                        {req.hospital}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{req.unitsNeeded} unit(s)</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-medium",
                          URGENCY_COLORS[req.urgency] || ""
                        )}
                      >
                        {req.urgency}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {req.donorStatus === "pending" ? (
                    <Button
                      size="sm"
                      onClick={() => onRespondToRequest?.(req._id)}
                      className="shrink-0 bg-red-600 hover:bg-red-700"
                    >
                      Respond
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewRequest?.(req._id)}
                      className="shrink-0"
                    >
                      View
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Donation timeline */}
      {donor.donationCount > 0 && donor.lastDonationDate && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            Recent Activity
          </h3>
          <div className="relative border-l-2 border-red-200 pl-6 space-y-4">
            <div className="relative">
              <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-red-300 bg-white">
                <Droplet className="h-3 w-3 text-red-500 fill-red-500" />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">
                  Last Donation
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(donor.lastDonationDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-green-300 bg-white">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">
                  Registered as Donor
                </p>
                <p className="text-xs text-slate-500">
                  Total: {donor.donationCount} donation
                  {donor.donationCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
