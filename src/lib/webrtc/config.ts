// ---------------------------------------------------------------------------
// WebRTC ICE configuration.
//
// STUN lets peers discover their public address for direct P2P connections —
// enough for the large majority of networks. For restrictive/symmetric NATs a
// TURN relay is required; configure one via the NEXT_PUBLIC_TURN_* env vars and
// it will be appended automatically. (TURN is optional; STUN-only works for
// most home/clinic networks.)
// ---------------------------------------------------------------------------

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl) {
    // Allow a comma-separated list so a single env var can advertise both UDP
    // and TCP TURN transports (e.g. "turn:host:3478,turn:host:3478?transport=tcp").
    const urls = turnUrl
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    servers.push({
      urls: urls.length === 1 ? urls[0]! : urls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export const ICE_SERVERS: RTCIceServer[] = buildIceServers();

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
};
