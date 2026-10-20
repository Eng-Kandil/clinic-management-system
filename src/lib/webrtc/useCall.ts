"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RTC_CONFIG } from "./config";

export type CallState =
  | "idle"
  | "connecting"
  | "waiting" // local media ready, waiting for the other party
  | "connected"
  | "ended"
  | "failed";

export type CallType = "voice" | "video";

interface UseCallOptions {
  consultationId: string;
  callType: CallType;
  selfId: string;
  /** Start acquiring media + connecting as soon as this becomes true. */
  enabled: boolean;
}

interface SignalMessage {
  kind: "offer" | "answer" | "ice" | "hangup" | "join" | "ready";
  payload: unknown;
  from: string;
  role: "patient" | "doctor";
  at: number;
}

interface UseCallResult {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  cameraOn: boolean;
  error: string | null;
  toggleMic: () => void;
  toggleCamera: () => void;
  hangup: () => void;
}

/**
 * 1:1 WebRTC call over the consultation SSE signaling bus.
 *
 * Negotiation is glare-free via a deterministic initiator: the participant with
 * the lexicographically greater user id creates the offer. Peer discovery works
 * regardless of who opens the page first because each side re-announces "join"
 * once when it first sees the other.
 */
export function useCall({
  consultationId,
  callType,
  selfId,
  enabled,
}: UseCallOptions): UseCallResult {
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === "video");
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const peerIdRef = useRef<string | null>(null);
  const announcedBackRef = useRef(false);
  const makingOfferRef = useRef(false);
  const endedRef = useRef(false);

  // ── Send a signaling message to the other peer ──────────────
  const send = useCallback(
    async (kind: SignalMessage["kind"], payload?: unknown) => {
      try {
        await fetch(`/api/consultations/${consultationId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, payload }),
        });
      } catch {
        // Transient network blips are tolerated; ICE/offer will be retried by
        // the connection state machine or a fresh negotiation.
      }
    },
    [consultationId]
  );

  // ── Tear everything down ────────────────────────────────────
  const cleanup = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const hangup = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    void send("hangup");
    cleanup();
    setCallState("ended");
    setRemoteStream(null);
  }, [send, cleanup]);

  // ── Create and send an offer (initiator only) ───────────────
  const maybeMakeOffer = useCallback(async () => {
    const pc = pcRef.current;
    const peerId = peerIdRef.current;
    if (!pc || !peerId) return;
    if (selfId <= peerId) return; // not the initiator
    if (makingOfferRef.current) return;
    if (pc.signalingState !== "stable") return;
    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send("offer", pc.localDescription);
    } catch {
      setError("Failed to start the call.");
    } finally {
      makingOfferRef.current = false;
    }
  }, [selfId, send]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(cand);
      } catch {
        // ignore individual bad candidates
      }
    }
  }, []);

  // ── Handle an inbound signaling message ─────────────────────
  const handleSignal = useCallback(
    async (msg: SignalMessage) => {
      if (msg.from === selfId) return; // ignore our own echo
      const pc = pcRef.current;
      if (!pc) return;

      // Remember the peer and ensure mutual discovery.
      if (!peerIdRef.current) peerIdRef.current = msg.from;

      switch (msg.kind) {
        case "join":
        case "ready": {
          if (!announcedBackRef.current) {
            announcedBackRef.current = true;
            await send("join"); // let a late-joining peer learn we're here
          }
          await maybeMakeOffer();
          break;
        }
        case "offer": {
          try {
            await pc.setRemoteDescription(
              msg.payload as RTCSessionDescriptionInit
            );
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send("answer", pc.localDescription);
          } catch {
            setError("Failed to answer the call.");
          }
          break;
        }
        case "answer": {
          try {
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                msg.payload as RTCSessionDescriptionInit
              );
              await flushIce();
            }
          } catch {
            /* ignore */
          }
          break;
        }
        case "ice": {
          const cand = msg.payload as RTCIceCandidateInit;
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(cand);
            } catch {
              /* ignore */
            }
          } else {
            pendingIceRef.current.push(cand);
          }
          break;
        }
        case "hangup": {
          endedRef.current = true;
          cleanup();
          setCallState("ended");
          setRemoteStream(null);
          break;
        }
      }
    },
    [selfId, send, maybeMakeOffer, flushIce, cleanup]
  );

  // Keep the latest handler in a ref so the SSE subscription is stable.
  const handleSignalRef = useRef(handleSignal);
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // ── Bring up the call when enabled ──────────────────────────
  useEffect(() => {
    if (!enabled) return;
    endedRef.current = false;
    let cancelled = false;

    (async () => {
      setCallState("connecting");
      setError(null);
      // 1) Local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
      } catch {
        if (!cancelled) {
          setError(
            "Could not access your microphone/camera. Check browser permissions."
          );
          setCallState("failed");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicOn(true);
      setCameraOn(callType === "video");

      // 2) Peer connection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (e.streams[0]) setRemoteStream(e.streams[0]);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) void send("ice", e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") setCallState("connected");
        else if (s === "failed") setCallState("failed");
        else if (s === "disconnected") {
          if (!endedRef.current) setCallState("waiting");
        }
      };

      // 3) Signaling channel (SSE)
      const es = new EventSource(
        `/api/consultations/${consultationId}/stream`
      );
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as {
            event: string;
            data: SignalMessage;
          };
          if (parsed.event === "signal" && parsed.data) {
            void handleSignalRef.current(parsed.data);
          }
        } catch {
          /* heartbeat/comment lines */
        }
      };

      setCallState("waiting");
      // 4) Announce ourselves
      await send("join");
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, consultationId, callType]);

  // ── Controls ────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !tracks.every((t) => t.enabled);
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;
    const next = !tracks.every((t) => t.enabled);
    tracks.forEach((t) => (t.enabled = next));
    setCameraOn(next);
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    micOn,
    cameraOn,
    error,
    toggleMic,
    toggleCamera,
    hangup,
  };
}
