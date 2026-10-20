"use client";

import {
  Check,
  X,
  Crown,
  Sparkles,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/helpers";

export interface PlanInfo {
  key: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: { label: string; included: boolean }[];
  popular?: boolean;
  icon: typeof Crown;
  gradient: string;
  iconColor: string;
}

const PLANS: PlanInfo[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Get started with essential clinic features",
    icon: Zap,
    gradient: "from-slate-50 to-slate-100",
    iconColor: "text-slate-500 bg-slate-100",
    features: [
      { label: "Basic appointment booking", included: true },
      { label: "View medical records", included: true },
      { label: "Email support", included: true },
      { label: "1 active consultation", included: true },
      { label: "Video consultations", included: false },
      { label: "AI-powered diagnosis", included: false },
      { label: "Advanced analytics", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    key: "basic",
    name: "Basic",
    price: 10,
    period: "month",
    description: "More features for regular patients",
    popular: true,
    icon: Sparkles,
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600 bg-blue-100",
    features: [
      { label: "Basic appointment booking", included: true },
      { label: "View medical records", included: true },
      { label: "Email support", included: true },
      { label: "5 active consultations", included: true },
      { label: "Video consultations", included: true },
      { label: "Prescription tracking", included: true },
      { label: "AI-powered diagnosis", included: false },
      { label: "Advanced analytics", included: false },
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: 20,
    period: "month",
    description: "Full access to all premium features",
    icon: Crown,
    gradient: "from-amber-50 to-orange-50",
    iconColor: "text-amber-600 bg-amber-100",
    features: [
      { label: "Basic appointment booking", included: true },
      { label: "View medical records", included: true },
      { label: "24/7 priority support", included: true },
      { label: "Unlimited consultations", included: true },
      { label: "Video consultations", included: true },
      { label: "Prescription tracking", included: true },
      { label: "AI-powered diagnosis", included: true },
      { label: "Advanced health analytics", included: true },
    ],
  },
];

interface PricingCardsProps {
  currentPlan: string;
  onSelectPlan: (plan: string) => void;
  loading?: boolean;
  loadingPlan?: string;
}

export default function PricingCards({
  currentPlan,
  onSelectPlan,
  loading = false,
  loadingPlan,
}: PricingCardsProps) {
  const getButtonProps = (planKey: string) => {
    const isCurrent = currentPlan === planKey;
    const planOrder = ["free", "basic", "premium"];
    const currentIdx = planOrder.indexOf(currentPlan);
    const targetIdx = planOrder.indexOf(planKey);
    const isUpgrade = targetIdx > currentIdx;
    const isLoading = loading && loadingPlan === planKey;

    if (isCurrent) {
      return {
        label: "Current Plan",
        variant: "outline" as const,
        disabled: true,
      };
    }

    return {
      label: isLoading
        ? "Processing..."
        : isUpgrade
        ? `Upgrade to ${PLANS.find((p) => p.key === planKey)?.name}`
        : `Switch to ${PLANS.find((p) => p.key === planKey)?.name}`,
      variant: isUpgrade ? ("default" as const) : ("outline" as const),
      disabled: loading,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
        <span className="text-xs text-slate-500">No real charges — plan changes are simulated</span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        const btnProps = getButtonProps(plan.key);
        const Icon = plan.icon;

        return (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 ${
              isCurrent
                ? "border-blue-500 shadow-lg shadow-blue-100 scale-[1.02]"
                : plan.popular
                ? "border-blue-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50"
                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            } bg-gradient-to-br ${plan.gradient} overflow-hidden`}
          >
            {/* Popular badge */}
            {plan.popular && !isCurrent && (
              <div className="absolute -right-8 top-5 rotate-45 bg-blue-600 px-10 py-1 text-xs font-semibold text-white shadow-sm">
                Popular
              </div>
            )}

            {/* Current plan badge */}
            {isCurrent && (
              <div className="absolute -right-8 top-5 rotate-45 bg-green-600 px-10 py-1 text-xs font-semibold text-white shadow-sm">
                Active
              </div>
            )}

            <div className="flex flex-1 flex-col p-6">
              {/* Icon & name */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${plan.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {plan.name}
                  </h3>
                </div>
              </div>

              {/* Price */}
              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {formatCurrency(plan.price, { decimals: 0 })}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-slate-500">
                      /{plan.period}
                    </span>
                  )}
                </div>
                {plan.price === 0 && (
                  <span className="text-sm text-slate-500">{plan.period}</span>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                    ) : (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <X className="h-3 w-3 text-slate-400" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        feature.included
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <div className="mt-6">
                <Button
                  variant={btnProps.variant}
                  disabled={btnProps.disabled}
                  className={`w-full ${
                    plan.key === "premium" && currentPlan !== "premium"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-0"
                      : ""
                  }`}
                  onClick={() => onSelectPlan(plan.key)}
                >
                  {loading && loadingPlan === plan.key && (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  {btnProps.label}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export { PLANS };
