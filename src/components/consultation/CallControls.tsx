"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";

interface CallControlsProps {
  participantName: string;
  currentUserName: string;
  isActive: boolean;
  startedAt?: string;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export default function CallControls({
  participantName,
  currentUserName,
  isActive,
  startedAt,
  onEndCall,
}: CallControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    if (!isActive || !startedAt) {
      // Reset timer when call becomes inactive — sync with external prop state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const toggleSpeaker = useCallback(() => setIsSpeakerOff((prev) => !prev), []);

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 px-6 py-8">
      {/* Call status */}
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-slate-400">
          {isActive ? "Voice Call" : "Call Ended"}
        </p>
        {isActive && (
          <p className="mt-1 font-mono text-2xl font-bold text-white">
            {formatDuration(elapsed)}
          </p>
        )}
      </div>

      {/* Participant avatars with pulse animation */}
      <div className="mb-8 flex items-center gap-8">
        {/* Current user */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {isActive && !isMuted && (
              <span className="absolute -inset-2 animate-ping rounded-full bg-green-400/30" />
            )}
            <div className="relative">
              <Avatar
                name={currentUserName}
                size="lg"
                className={`ring-2 ${
                  isActive && !isMuted
                    ? "ring-green-400"
                    : "ring-slate-600"
                }`}
              />
              {isMuted && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-slate-300">You</span>
        </div>

        {/* Connection line */}
        <div className="flex items-center gap-1">
          {isActive ? (
            <>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 [animation-delay:0.2s]" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 [animation-delay:0.4s]" />
            </>
          ) : (
            <span className="text-xs text-slate-500">disconnected</span>
          )}
        </div>

        {/* Other participant */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {isActive && (
              <span className="absolute -inset-2 animate-ping rounded-full bg-blue-400/30" />
            )}
            <Avatar
              name={participantName}
              size="lg"
              className={`ring-2 ${
                isActive ? "ring-blue-400" : "ring-slate-600"
              }`}
            />
          </div>
          <span className="text-xs font-medium text-slate-300">
            {participantName}
          </span>
        </div>
      </div>

      {/* Call controls */}
      {isActive && (
        <div className="flex items-center gap-4">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* End call */}
          <Button
            onClick={onEndCall}
            className="h-16 w-16 rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              isSpeakerOff
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
            title={isSpeakerOff ? "Speaker on" : "Speaker off"}
          >
            {isSpeakerOff ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </button>
        </div>
      )}

      {!isActive && (
        <p className="mt-4 text-sm text-slate-500">
          Call ended &middot; {formatDuration(elapsed)}
        </p>
      )}
    </div>
  );
}
