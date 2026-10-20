import { Subscription } from "@/lib/db/models/Subscription";
import { Patient } from "@/lib/db/models/Patient";

/**
 * A patient may message a doctor only with an active paid plan (basic/premium).
 * Returns true when the caller's patient profile has a non-free, active,
 * unexpired subscription.
 */
export async function hasActiveChatSubscription(
  userId: string
): Promise<boolean> {
  const patient = await Patient.findOne({ userId }).select("_id").lean();
  if (!patient) return false;

  const sub = await Subscription.findOne({
    patientId: patient._id,
    isActive: true,
  })
    .select("plan endDate")
    .lean();

  if (!sub || sub.plan === "free") return false;
  if (sub.endDate && new Date(sub.endDate).getTime() < Date.now()) return false;
  return true;
}
