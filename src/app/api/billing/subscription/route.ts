import { NextRequest } from "next/server";
import connectDB from "@/lib/db/connect";
import { auth } from "@/lib/auth/auth.config";
import { Subscription } from "@/lib/db/models/Subscription";
import { Patient } from "@/lib/db/models/Patient";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { formatCurrency, generateTransactionId } from "@/lib/utils/helpers";
import { createAuditLog } from "@/lib/utils/audit";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLAN_DETAILS: Record<
  string,
  { price: number; features: string[] }
> = {
  free: {
    price: 0,
    features: [
      "Basic appointment booking",
      "View medical records",
      "Email support",
      "1 active consultation",
    ],
  },
  basic: {
    price: 10,
    features: [
      "Everything in Free",
      "Priority appointment booking",
      "Video consultations",
      "Prescription tracking",
      "5 active consultations",
      "Chat support",
    ],
  },
  premium: {
    price: 20,
    features: [
      "Everything in Basic",
      "Unlimited consultations",
      "AI-powered diagnosis",
      "Advanced health analytics",
      "Family member accounts",
      "24/7 priority support",
      "Custom health reports",
    ],
  },
};

// ---------------------------------------------------------------------------
// GET /api/billing/subscription — Get current user's subscription
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    // Find the patient profile
    const patient = await Patient.findOne({ userId: session.user.id })
      .select("_id")
      .lean();

    if (!patient) {
      return successResponse({
        subscription: null,
        plans: PLAN_DETAILS,
        message:
          session.user.role === "patient"
            ? "No patient profile found for this account"
            : "Subscriptions are for patient accounts only",
      });
    }

    const subscription = await Subscription.findOne({
      patientId: patient._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return successResponse({
        subscription: null,
        plans: PLAN_DETAILS,
      });
    }

    return successResponse({
      subscription,
      plans: PLAN_DETAILS,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/billing/subscription — Subscribe to or change a plan
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const patient = await Patient.findOne({ userId: session.user.id })
      .select("_id")
      .lean();
    if (!patient)
      return errorResponse("Patient profile not found", 404);

    const body = await req.json();
    const { plan } = body;

    if (!plan || !["free", "basic", "premium"].includes(plan)) {
      return errorResponse(
        "Invalid plan. Choose from: free, basic, premium",
        400
      );
    }

    const planInfo = PLAN_DETAILS[plan];
    if (!planInfo) {
      return errorResponse("Invalid plan", 400);
    }

    // Check if the user already has this plan active
    const existing = await Subscription.findOne({
      patientId: patient._id,
      isActive: true,
    }).lean();

    if (existing && existing.plan === plan) {
      return errorResponse("You are already on this plan", 400);
    }

    // ── Mock payment for paid plans ─────────────────────────────────────
    let transactionId: string | undefined;

    if (planInfo.price > 0) {
      // Simulate 2s payment delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      transactionId = generateTransactionId();
    }

    // Deactivate any existing active subscription
    if (existing) {
      await Subscription.findByIdAndUpdate(existing._id, {
        $set: { isActive: false },
      });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1); // 1-month subscription

    const paymentEntry =
      planInfo.price > 0 && transactionId
        ? [
            {
              amount: planInfo.price,
              date: now,
              method: "mock_credit_card",
              transactionId,
            },
          ]
        : [];

    const subscription = await Subscription.create({
      patientId: patient._id,
      plan,
      price: planInfo.price,
      features: planInfo.features,
      startDate: now,
      endDate,
      isActive: true,
      autoRenew: plan !== "free",
      paymentHistory: paymentEntry,
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: existing ? "CHANGE_SUBSCRIPTION" : "CREATE_SUBSCRIPTION",
      resource: "Subscription",
      resourceId: subscription._id.toString(),
      details: existing
        ? `Changed subscription from "${existing.plan}" to "${plan}". Price: ${formatCurrency(planInfo.price, { decimals: 0 })}/mo`
        : `Subscribed to "${plan}" plan. Price: ${formatCurrency(planInfo.price, { decimals: 0 })}/mo`,
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      severity: "info",
      metadata: { plan, price: planInfo.price, transactionId },
    });

    return successResponse(
      {
        subscription,
        transactionId,
        plans: PLAN_DETAILS,
      },
      existing
        ? `Plan changed to ${plan} successfully`
        : `Subscribed to ${plan} plan successfully`,
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/billing/subscription — Cancel subscription or toggle auto-renew
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const patient = await Patient.findOne({ userId: session.user.id })
      .select("_id")
      .lean();
    if (!patient)
      return errorResponse("Patient profile not found", 404);

    const body = await req.json();
    const { action } = body; // "cancel" | "toggle_auto_renew"

    const subscription = await Subscription.findOne({
      patientId: patient._id,
      isActive: true,
    });

    if (!subscription) {
      return errorResponse("No active subscription found", 404);
    }

    if (action === "cancel") {
      if (subscription.plan === "free") {
        return errorResponse("Cannot cancel a free plan", 400);
      }

      subscription.isActive = false;
      subscription.autoRenew = false;
      await subscription.save();

      await createAuditLog({
        userId: session.user.id,
        action: "CANCEL_SUBSCRIPTION",
        resource: "Subscription",
        resourceId: subscription._id.toString(),
        details: `Cancelled "${subscription.plan}" subscription`,
        ipAddress:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        severity: "warning",
      });

      return successResponse(
        subscription,
        "Subscription cancelled successfully"
      );
    }

    if (action === "toggle_auto_renew") {
      subscription.autoRenew = !subscription.autoRenew;
      await subscription.save();

      return successResponse(
        subscription,
        `Auto-renew ${subscription.autoRenew ? "enabled" : "disabled"}`
      );
    }

    return errorResponse(
      'Invalid action. Use "cancel" or "toggle_auto_renew"',
      400
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return errorResponse(message, 500);
  }
}
