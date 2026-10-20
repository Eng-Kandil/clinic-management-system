import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { SideEffectSchema } from "@/lib/validations/treatment.schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;

  const body = await req.json();
  const parsed = SideEffectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { TreatmentTracking } = await import("@/lib/db/models");

  const entry = await TreatmentTracking.findById(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  entry.sideEffects = entry.sideEffects ?? [];
  entry.sideEffects.push({
    symptom: parsed.data.symptom,
    severity: parsed.data.severity,
    occurredAt: parsed.data.occurredAt
      ? new Date(parsed.data.occurredAt)
      : new Date(),
  });
  await entry.save();

  return NextResponse.json(entry, { status: 201 });
}
