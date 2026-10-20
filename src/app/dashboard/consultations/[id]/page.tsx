"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Video,
  MessageSquare,
  Clock,
  User,
  Stethoscope,
  FileText,
  Loader2,
  PhoneOff,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils/helpers";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import ChatWindow from "@/components/consultation/ChatWindow";
import MessageInput from "@/components/consultation/MessageInput";
import CallStage from "@/components/consultation/CallStage";
import RatingDialog from "@/components/consultation/RatingDialog";
import type { ChatMessage } from "@/types";

interface ConsultationDetail {
  _id: string;
  type: "chat" | "voice" | "video";
  status: "waiting" | "active" | "ended";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  summary?: string;
  messages: ChatMessage[];
  patientId?: {
    _id: string;
    userId?: string;
    user?: {
      _id?: string;
      name: string;
      email?: string;
      phone?: string;
      avatar?: string;
    };
  };
  doctorId?: {
    _id: string;
    userId?: string;
    specialization?: string;
    department?: string;
    consultationFee?: number;
    user?: {
      _id?: string;
      name: string;
      email?: string;
      phone?: string;
      avatar?: string;
    };
  };
}

interface SessionUser {
  id: string;
  role: "admin" | "doctor" | "patient" | "security_officer";
  name: string;
  email: string;
}

async function fetchSession(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export default function ConsultationRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // State
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [showRating, setShowRating] = useState(false);
  const [showEndNotes, setShowEndNotes] = useState(false);
  const [endNotes, setEndNotes] = useState("");
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  // Hidden by default on mobile so the call/chat gets the full width; the
  // toggle in the top bar reveals it. On large screens it's always shown.
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch session ────────────────────────────────────────
  useEffect(() => {
    fetchSession().then(setSession);
  }, []);

  // ── Fetch consultation ───────────────────────────────────
  const fetchConsultation = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultations/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setConsultation(json.data);
        setMessages(json.data.messages || []);
        setLoading(false);

        // Show rating dialog for patient if consultation ended
        if (json.data.status === "ended") {
          // Delay showing rating dialog
          setTimeout(() => setShowRating(true), 1000);
        }
      }
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConsultation();
  }, [fetchConsultation]);

  // ── Poll for new messages every 3s when consultation is active ──
  useEffect(() => {
    if (
      !consultation ||
      (consultation.status !== "active" && consultation.status !== "waiting")
    ) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/consultations/${id}/messages?page=1&limit=100`
        );
        const json = await res.json();
        if (json.success && json.data) {
          const newMessages: ChatMessage[] = json.data.messages || [];
          setMessages(newMessages);
          setHasMore(json.data.pagination?.hasMore || false);
        }
      } catch {
        // Silently fail polling
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [consultation?.status, id, consultation]);

  // ── Send message ─────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "text" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newMsg: ChatMessage = {
          senderId: json.data.senderId?.toString() || session?.id || "",
          content: json.data.content,
          type: json.data.type || "text",
          fileUrl: json.data.fileUrl,
          timestamp: json.data.timestamp,
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch {
      // Could add toast notification here
    }
  };

  // ── Load older messages ──────────────────────────────────
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = msgPage + 1;
      const res = await fetch(
        `/api/consultations/${id}/messages?page=${nextPage}&limit=50`
      );
      const json = await res.json();
      if (json.success && json.data) {
        const olderMessages: ChatMessage[] = json.data.messages || [];
        setMessages((prev) => [...olderMessages, ...prev]);
        setMsgPage(nextPage);
        setHasMore(json.data.pagination?.hasMore || false);
      }
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Start consultation (doctor) ──────────────────────────
  const handleStartConsultation = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-progress" }),
      });
      const json = await res.json();
      if (json.success) {
        setConsultation((prev) =>
          prev
            ? {
                ...prev,
                status: "active",
                startedAt: new Date().toISOString(),
              }
            : prev
        );
      }
    } catch {
      // silent
    } finally {
      setStarting(false);
    }
  };

  // ── End consultation ─────────────────────────────────────
  const handleEndConsultation = async () => {
    setEnding(true);
    try {
      const res = await fetch(`/api/consultations/${id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: endNotes || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setConsultation((prev) =>
          prev
            ? {
                ...prev,
                status: "ended",
                endedAt: new Date().toISOString(),
                summary: endNotes || prev.summary,
              }
            : prev
        );
        setShowEndNotes(false);
        setShowRating(true);
      }
    } catch {
      // silent
    } finally {
      setEnding(false);
    }
  };

  // ── Submit rating ────────────────────────────────────────
  const handleSubmitRating = async (_rating: number, _feedback: string) => {
    // In a production app, this would call an API endpoint to save the rating
    // For now, just close the dialog
    setShowRating(false);
  };

  // ── Derived values ───────────────────────────────────────
  const isDoctor = session?.role === "doctor";
  const isPatient = session?.role === "patient";
  const isActive =
    consultation?.status === "active" || consultation?.status === "waiting";
  const isMediaCall =
    consultation?.type === "voice" || consultation?.type === "video";

  const participantName = isPatient
    ? `Dr. ${consultation?.doctorId?.user?.name || "Unknown"}`
    : consultation?.patientId?.user?.name || "Unknown Patient";

  const currentUserName = session?.name || "You";

  // ── Keep consultation status in sync (real-time both sides) ──
  // The doctor starting or ending the call updates the DB; this poll makes the
  // other participant react — the patient auto-enters when the call starts and
  // both sides drop to the ended view when it finishes.
  useEffect(() => {
    if (
      !consultation ||
      (consultation.status !== "active" && consultation.status !== "waiting")
    ) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/consultations/${id}`);
        const json = await res.json();
        if (!json.success || !json.data) return;
        const next = json.data as ConsultationDetail;
        setConsultation((prev) =>
          prev && prev.status !== next.status
            ? {
                ...prev,
                status: next.status,
                startedAt: next.startedAt ?? prev.startedAt,
                endedAt: next.endedAt ?? prev.endedAt,
                duration: next.duration ?? prev.duration,
                summary: next.summary ?? prev.summary,
              }
            : prev
        );
        if (next.status === "ended") {
          setShowEndNotes(false);
          if (isPatient) setTimeout(() => setShowRating(true), 800);
        }
      } catch {
        // Ignore transient poll errors.
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [consultation?.status, consultation, id, isPatient]);

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="flex flex-1 gap-4">
          <div className="flex-1 space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="hidden w-80 lg:block">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Stethoscope className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900">
            Consultation not found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            This consultation may have been removed.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/consultations")}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Consultations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/consultations")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar name={participantName} size="md" />
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {participantName}
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={consultation.status} />
              <span className="text-xs text-slate-500">
                {consultation.type === "video" ? (
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Video Call
                  </span>
                ) : consultation.type === "voice" ? (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Voice Call
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Chat
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Info panel toggle (mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setShowInfoPanel(!showInfoPanel)}
          >
            <User className="h-5 w-5" />
          </Button>

          {/* Start button (for doctor, when waiting) */}
          {isDoctor && consultation.status === "waiting" && (
            <Button onClick={handleStartConsultation} loading={starting}>
              <Activity className="mr-1.5 h-4 w-4" />
              Start Consultation
            </Button>
          )}

          {/* End consultation button */}
          {isActive && (isDoctor || isPatient) && (
            <Button
              variant="danger"
              onClick={() => {
                if (isDoctor) {
                  setShowEndNotes(true);
                } else {
                  handleEndConsultation();
                }
              }}
            >
              <PhoneOff className="mr-1.5 h-4 w-4" />
              End
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Chat / Call area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          {isMediaCall ? (
            // ── Live voice / video call ──
            consultation.status === "ended" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-slate-50 text-center">
                <PhoneOff className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  This {consultation.type} call has ended.
                </p>
                {consultation.duration !== undefined && (
                  <p className="text-xs text-slate-500">
                    Duration: {consultation.duration} min
                  </p>
                )}
              </div>
            ) : consultation.status === "waiting" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-800 to-slate-900 text-center">
                <Avatar name={participantName} size="lg" className="ring-2 ring-slate-600" />
                <p className="text-sm text-slate-300">
                  {isDoctor
                    ? "Press “Start Consultation” to begin the call."
                    : `Waiting for Dr. ${
                        consultation.doctorId?.user?.name || ""
                      } to start the call…`}
                </p>
              </div>
            ) : (
              // Bound the call to a centered, sensibly-sized card so the video
              // isn't a full-bleed close-up and the controls stay on screen.
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-2 sm:p-4">
                <div className="relative flex aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl shadow-lg sm:aspect-video sm:max-w-3xl">
                  <CallStage
                    consultationId={consultation._id}
                    callType={consultation.type === "video" ? "video" : "voice"}
                    selfId={session?.id || ""}
                    participantName={participantName}
                    currentUserName={currentUserName}
                    enabled={consultation.status === "active"}
                    onEndCall={() => {
                      if (isDoctor) {
                        setShowEndNotes(true);
                      } else {
                        handleEndConsultation();
                      }
                    }}
                  />
                </div>
              </div>
            )
          ) : (
            // ── Text chat ──
            <>
              <ChatWindow
                messages={messages}
                currentUserId={session?.id || ""}
                participantName={participantName}
                currentUserName={currentUserName}
                isActive={isActive}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
              />

              {isActive ? (
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={!isActive}
                  placeholder={
                    consultation.status === "waiting"
                      ? "Waiting for doctor to start..."
                      : "Type a message..."
                  }
                />
              ) : (
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <p className="text-center text-sm text-slate-500">
                    This consultation has ended.{" "}
                    {consultation.duration && (
                      <span>Duration: {consultation.duration} minutes.</span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info panel (right side) */}
        <div
          className={`w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white lg:w-80 lg:border-l lg:border-t-0 ${
            showInfoPanel ? "block" : "hidden lg:block"
          }`}
        >
          <div className="space-y-6 p-4">
            {/* Participant info */}
            <div className="text-center">
              <Avatar
                name={participantName}
                size="lg"
                className="mx-auto"
              />
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {participantName}
              </h3>
              {isPatient && consultation.doctorId?.specialization && (
                <p className="text-sm text-slate-500">
                  {consultation.doctorId.specialization}
                </p>
              )}
              {isPatient && consultation.doctorId?.department && (
                <Badge variant="outline" className="mt-2">
                  {consultation.doctorId.department}
                </Badge>
              )}
            </div>

            {/* Consultation details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Consultation Details
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Started:{" "}
                    {consultation.startedAt
                      ? new Date(consultation.startedAt).toLocaleTimeString(
                          "en-US",
                          { hour: "2-digit", minute: "2-digit" }
                        )
                      : "Not yet"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {consultation.type === "voice" ? (
                    <Phone className="h-4 w-4 text-slate-400" />
                  ) : consultation.type === "video" ? (
                    <Video className="h-4 w-4 text-slate-400" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-slate-600">
                    Type:{" "}
                    {consultation.type === "voice"
                      ? "Voice Call"
                      : consultation.type === "video"
                      ? "Video Call"
                      : "Chat"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    Messages: {messages.length}
                  </span>
                </div>
                {consultation.duration !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      Duration: {consultation.duration} min
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor notes (for doctor) */}
            {isDoctor && isActive && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Quick Notes
                </h4>
                <Textarea
                  placeholder="Write your consultation notes here..."
                  rows={4}
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                />
              </div>
            )}

            {/* Summary (when ended) */}
            {consultation.status === "ended" && consultation.summary && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Summary
                </h4>
                <p className="text-sm text-slate-600">
                  {consultation.summary}
                </p>
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contact Info
              </h4>
              <div className="space-y-1.5">
                {isPatient && consultation.doctorId?.user?.email && (
                  <p className="text-sm text-slate-600">
                    {consultation.doctorId.user.email}
                  </p>
                )}
                {isDoctor && consultation.patientId?.user?.email && (
                  <p className="text-sm text-slate-600">
                    {consultation.patientId.user.email}
                  </p>
                )}
                {isPatient && consultation.doctorId?.user?.phone && (
                  <p className="text-sm text-slate-600">
                    {consultation.doctorId.user.phone}
                  </p>
                )}
                {isDoctor && consultation.patientId?.user?.phone && (
                  <p className="text-sm text-slate-600">
                    {consultation.patientId.user.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Fee info */}
            {isPatient && consultation.doctorId?.consultationFee !== undefined && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Consultation Fee</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(consultation.doctorId.consultationFee, { decimals: 0 })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End consultation dialog (for doctor with notes) */}
      {showEndNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowEndNotes(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              End Consultation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a summary or notes before ending this consultation.
            </p>
            <div className="mt-4">
              <Textarea
                label="Consultation Summary"
                placeholder="Brief summary of the consultation, diagnosis, or follow-up instructions..."
                rows={4}
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEndNotes(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleEndConsultation}
                loading={ending}
              >
                {ending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  "End Consultation"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rating dialog (for patient after consultation ends) */}
      {isPatient && consultation.status === "ended" && (
        <RatingDialog
          open={showRating}
          onOpenChange={setShowRating}
          consultationId={consultation._id}
          doctorName={
            consultation.doctorId?.user?.name || "Unknown"
          }
          onSubmit={handleSubmitRating}
        />
      )}
    </div>
  );
}
