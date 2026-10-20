import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/connect";
import { Rating, Consultation } from "@/lib/db/models";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { id } = await params;

  const body = await req.json();
  const { score, comment } = body;

  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: "Score must be 1-5" }, { status: 400 });
  }

  const consultation = await Consultation.findById(id).lean();
  if (!consultation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the patient can rate — check existing rating
  const existing = await Rating.findOne({
    consultationId: id,
    patientId: consultation.patientId,
  }).lean();
  if (existing)
    return NextResponse.json({ error: "Already rated" }, { status: 409 });

  const rating = await Rating.create({
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    consultationId: id,
    score,
    comment: comment ?? "",
  });

  return NextResponse.json(rating, { status: 201 });
}
