import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.",
      },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    // Dynamic import to avoid build errors when livekit-server-sdk is not installed
    // @ts-expect-error -- optional peer dependency; runtime guard above ensures env vars are set
    const { AccessToken } = await import("livekit-server-sdk").catch(() => {
      throw new Error(
        "livekit-server-sdk not installed. Run: npm install livekit-server-sdk"
      );
    });

    const token = new AccessToken(apiKey, apiSecret, {
      identity: session.user.id,
      name: session.user.name ?? session.user.email ?? session.user.id,
    });
    token.addGrant({
      room: `consult-${id}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      url: livekitUrl,
      room: `consult-${id}`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "LiveKit token generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
