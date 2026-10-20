"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useCall, type CallType, type CallState } from "@/lib/webrtc/useCall";

interface CallStageProps {
  consultationId: string;
  callType: CallType;
  selfId: string;
  participantName: string;
  currentUserName: string;
  /** True once the consultation is live (status active). */
  enabled: boolean;
  /** Invoked when the user presses the hang-up button. */
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return hrs > 0 ? `${hrs.toString().padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

function statusLabel(state: CallState, name: string): string {
  switch (state) {
    case "connecting":
      return "Starting…";
    case "waiting":
      return `Waiting for ${name} to join…`;
    case "connected":
      return "Connected";
    case "failed":
      return "Connection problem";
    case "ended":
      return "Call ended";
    default:
      return "";
  }
}

/** Binds a MediaStream to a <video> element. */
function VideoTile({
  stream,
  muted,
  mirrored,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${mirrored ? "scale-x-[-1] " : ""}${className ?? ""}`}
    />
  );
}

/** Plays the remote audio track (used for voice calls where there's no video). */
function AudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

export default function CallStage({
  consultationId,
  callType,
  selfId,
  participantName,
  currentUserName,
  enabled,
  onEndCall,
}: CallStageProps) {
  const {
    callState,
    localStream,
    remoteStream,
    micOn,
    cameraOn,
    error,
    toggleMic,
    toggleCamera,
    hangup,
  } = useCall({ consultationId, callType, selfId, enabled });

  // Elapsed timer — counts from the moment the call first connects.
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (callState === "connected" && startRef.current === null) {
      startRef.current = Date.now();
    }
    if (callState !== "connected") return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const handleHangup = () => {
    hangup();
    onEndCall();
  };

  const isVideo = callType === "video";
  const remoteConnected = callState === "connected" && !!remoteStream;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
      {callType === "voice" && <AudioSink stream={remoteStream} />}

      {/* ── Video layout ── */}
      {isVideo ? (
        <div className="relative h-full w-full">
          {/* Remote (main) */}
          {remoteConnected ? (
            <VideoTile
              stream={remoteStream}
              className="h-full w-full bg-black object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <Avatar name={participantName} size="lg" className="ring-2 ring-slate-600" />
              <p className="text-sm text-slate-300">
                {statusLabel(callState, participantName)}
              </p>
            </div>
          )}

          {/* Local (PiP) */}
          <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-lg border border-slate-700 bg-black shadow-lg sm:h-40 sm:w-32">
            {cameraOn ? (
              <VideoTile
                stream={localStream}
                muted
                mirrored
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <VideoOff className="h-6 w-6 text-slate-500" />
              </div>
            )}
          </div>

          {/* Status pill */}
          <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {callState === "connected" ? formatDuration(elapsed) : statusLabel(callState, participantName)}
          </div>
        </div>
      ) : (
        /* ── Voice layout ── */
        <div className="flex flex-col items-center py-10">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-slate-400">Voice Call</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">
              {callState === "connected"
                ? formatDuration(elapsed)
                : statusLabel(callState, participantName)}
            </p>
          </div>
          <div className="mb-2 flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {micOn && callState === "connected" && (
                  <span className="absolute -inset-2 animate-ping rounded-full bg-green-400/30" />
                )}
                <Avatar
                  name={currentUserName}
                  size="lg"
                  className={`ring-2 ${micOn ? "ring-green-400" : "ring-slate-600"}`}
                />
              </div>
              <span className="text-xs font-medium text-slate-300">You</span>
            </div>
            <div className="flex items-center gap-1">
              {remoteConnected ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 [animation-delay:0.2s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 [animation-delay:0.4s]" />
                </>
              ) : (
                <span className="text-xs text-slate-500">connecting…</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {remoteConnected && (
                  <span className="absolute -inset-2 animate-ping rounded-full bg-blue-400/30" />
                )}
                <Avatar
                  name={participantName}
                  size="lg"
                  className={`ring-2 ${remoteConnected ? "ring-blue-400" : "ring-slate-600"}`}
                />
              </div>
              <span className="text-xs font-medium text-slate-300">
                {participantName}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 rounded-md bg-red-500/90 px-3 py-1.5 text-xs text-white">
          {error}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
            micOn
              ? "bg-slate-700 text-white hover:bg-slate-600"
              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          }`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>

        {isVideo && (
          <button
            onClick={toggleCamera}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              cameraOn
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            }`}
            title={cameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {cameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </button>
        )}

        <button
          onClick={handleHangup}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          title="End call"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
