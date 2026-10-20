"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  ArrowLeft,
  Calendar,
  CreditCard,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";
import PricingCards from "@/components/billing/PricingCards";
import { formatCurrency } from "@/lib/utils/helpers";

// ── Types ────────────────────────────────────────────────────────────────

interface SubscriptionData {
  _id?: string;
  plan: "free" | "basic" | "premium";
  price: number;
  features: string[];
  isActive: boolean;
  autoRenew: boolean;
  startDate: string;
  endDate: string | null;
  paymentHistory: {
    amount: number;
    date: string;
    method: string;
    transactionId: string;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────

const PLAN_ICON: Record<string, typeof Crown> = {
  free: Zap,
  basic: Sparkles,
  premium: Crown,
};

const PLAN_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  basic: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  premium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

// ── Main Page ────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Fetch subscription ─────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/billing/subscription");
      const json = await res.json();
      if (json.success) {
        setSubscription(json.data?.subscription || null);
      }
    } catch {
      setErrorMessage("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ── Dismiss messages after 5s ──────────────────────────────────────

  useEffect(() => {
    if (successMessage || errorMessage) {
      const t = setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage, errorMessage]);

  // ── Select plan ────────────────────────────────────────────────────

  const handleSelectPlan = async (plan: string) => {
    if (subscription?.plan === plan) return;

    setActionLoading(true);
    setLoadingPlan(plan);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.message || `Switched to ${plan} plan`);
        await fetchSubscription();
      } else {
        setErrorMessage(json.message || "Failed to change plan");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setActionLoading(false);
      setLoadingPlan("");
    }
  };

  // ── Cancel subscription ────────────────────────────────────────────

  const handleCancel = async () => {
    setActionLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Subscription cancelled. You can resubscribe anytime.");
        setCancelDialogOpen(false);
        await fetchSubscription();
      } else {
        setErrorMessage(json.message || "Failed to cancel subscription");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle auto-renew ──────────────────────────────────────────────

  const handleToggleAutoRenew = async () => {
    setAutoRenewLoading(true);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_auto_renew" }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(json.message || "Auto-renew updated");
        await fetchSubscription();
      } else {
        setErrorMessage(json.message || "Failed to update auto-renew");
      }
    } catch {
      setErrorMessage("Network error");
    } finally {
      setAutoRenewLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  const currentPlan = subscription?.plan || "free";
  const planColor = PLAN_COLOR[currentPlan] ?? PLAN_COLOR.free!;
  const PlanIcon = PLAN_ICON[currentPlan] ?? PLAN_ICON.free!;

  return (
    <div className="space-y-8">
      {/* DEMO MODE banner */}
      <div className="rounded-md bg-yellow-50 border border-yellow-300 px-4 py-3 flex items-center gap-2">
        <span className="text-yellow-800 font-semibold">&#9888; DEMO MODE</span>
        <span className="text-yellow-700 text-sm">No real charges. Payments are simulated for demonstration purposes only.</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Billing
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Subscription & Plans
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your subscription plan and billing preferences
          </p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Current plan card */}
      {loading ? (
        <CardSkeleton />
      ) : (
        <div
          className={`rounded-2xl border-2 ${planColor.border} ${planColor.bg} p-6 shadow-sm`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                  currentPlan === "premium"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                    : currentPlan === "basic"
                    ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                <PlanIcon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {currentPlan.charAt(0).toUpperCase() +
                      currentPlan.slice(1)}{" "}
                    Plan
                  </h2>
                  {subscription?.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {subscription?.price
                    ? `${formatCurrency(subscription.price, { decimals: 0 })}/month`
                    : "Free forever"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date info */}
              {subscription?.startDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Since{" "}
                    {new Date(subscription.startDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                </div>
              )}

              {subscription?.endDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>
                    Renews{" "}
                    {new Date(subscription.endDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                </div>
              )}

              {/* Auto-renew toggle */}
              {currentPlan !== "free" && subscription?.isActive && (
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={autoRenewLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {autoRenewLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : subscription.autoRenew ? (
                    <ToggleRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-slate-400" />
                  )}
                  Auto-renew{" "}
                  {subscription.autoRenew ? "on" : "off"}
                </button>
              )}

              {/* Cancel button */}
              {currentPlan !== "free" && subscription?.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>

          {/* Features preview */}
          {subscription?.features && subscription.features.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {subscription.features.map((feature, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 border border-slate-200/60"
                >
                  <Shield className="h-3 w-3 text-blue-500" />
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pricing cards */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            Choose Your Plan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select the plan that works best for your healthcare needs
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <PricingCards
            currentPlan={currentPlan}
            onSelectPlan={handleSelectPlan}
            loading={actionLoading}
            loadingPlan={loadingPlan}
          />
        )}
      </div>

      {/* Billing History */}
      {subscription?.paymentHistory &&
        subscription.paymentHistory.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Billing History
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="px-6 py-3.5 font-medium text-slate-600">
                        Date
                      </th>
                      <th className="px-6 py-3.5 font-medium text-slate-600">
                        Amount
                      </th>
                      <th className="px-6 py-3.5 font-medium text-slate-600">
                        Method
                      </th>
                      <th className="px-6 py-3.5 font-medium text-slate-600">
                        Transaction ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscription.paymentHistory.map((entry, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 text-slate-700">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(entry.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <CreditCard className="h-3.5 w-3.5" />
                            {entry.method
                              .replace(/^mock_/, "")
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {entry.transactionId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Subscription"
        description="Are you sure you want to cancel? You will lose access to premium features at the end of your billing period."
      >
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">What happens when you cancel:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>
              - Your plan will remain active until the end of the current billing period
            </li>
            <li>- You will be downgraded to the Free plan after that</li>
            <li>- You can resubscribe at any time</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setCancelDialogOpen(false)}
          >
            Keep My Plan
          </Button>
          <Button
            variant="danger"
            loading={actionLoading}
            onClick={handleCancel}
          >
            Cancel Subscription
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
