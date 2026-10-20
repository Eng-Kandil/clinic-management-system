"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Loader2,
  Lock,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/helpers";

type PaymentMethod = "credit_card" | "debit_card" | "insurance" | "cash";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  onPaymentComplete: () => void;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: typeof CreditCard;
  color: string;
}[] = [
  {
    value: "credit_card",
    label: "Credit Card",
    icon: CreditCard,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "debit_card",
    label: "Debit Card",
    icon: Banknote,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    value: "insurance",
    label: "Insurance",
    icon: ShieldCheck,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    value: "cash",
    label: "Cash / Other",
    icon: Globe,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
];

type Step = "method" | "details" | "processing" | "success";

export default function PaymentModal({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  amount,
  onPaymentComplete,
}: PaymentModalProps) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PaymentMethod>("credit_card");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");

  // Mock card details (pre-filled)
  const [cardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry] = useState("12/28");
  const [cardCvv] = useState("123");
  const [cardName] = useState("Test Cardholder");

  // Reset on open/close
  useEffect(() => {
    if (open) {
      // Resetting modal state on `open` prop change is the intended sync behavior; safe here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("method");
      setMethod("credit_card");
      setError("");
      setTransactionId("");
    }
  }, [open]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleProceed = () => {
    if (step === "method") {
      setStep("details");
    }
  };

  const handlePay = async () => {
    setStep("processing");
    setError("");

    try {
      const res = await fetch("/api/billing/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount,
          method,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setTransactionId(json.data?.payment?.transactionId || "");
        setStep("success");
      } else {
        setError(json.message || "Payment failed");
        setStep("details");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("details");
    }
  };

  const handleFinish = () => {
    onPaymentComplete();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={step !== "processing" ? onClose : undefined}
      />

      <div className="relative z-50 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Payment
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">DEMO MODE</span>
              </div>
              <h2 className="mt-1 text-xl font-bold">
                {formatCurrency(amount)}
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                Invoice {invoiceNumber}
              </p>
            </div>
            {step !== "processing" && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
        </div>

        <div className="p-6">
          {/* Step: Select Method */}
          {step === "method" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700">
                Select Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = method === pm.value;
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setMethod(pm.value)}
                      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? `${pm.color} ring-2 ring-offset-1 ring-blue-500`
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{pm.label}</span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <Button className="w-full mt-2" onClick={handleProceed}>
                Continue
              </Button>
            </div>
          )}

          {/* Step: Payment Details */}
          {step === "details" && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {(method === "credit_card" || method === "debit_card") && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">
                    Card Details{" "}
                    <span className="text-xs text-slate-400">
                      (pre-filled test data)
                    </span>
                  </h3>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        readOnly
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 pr-10 text-sm text-slate-700"
                      />
                      <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Expiry
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        readOnly
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardCvv}
                        readOnly
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        readOnly
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 truncate"
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === "insurance" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">
                    Insurance Details
                  </h3>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700">
                    <p className="font-medium">Mock Insurance Co.</p>
                    <p className="mt-1 text-xs text-purple-500">
                      Policy: INS-MOCK-2025-001
                    </p>
                    <p className="mt-0.5 text-xs text-purple-500">
                      Coverage: 100% of billed amount
                    </p>
                  </div>
                </div>
              )}

              {method === "cash" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">
                    Cash Payment
                  </h3>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    <p>
                      Cash payment of{" "}
                      <span className="font-bold">
                        {formatCurrency(amount)}
                      </span>{" "}
                      will be recorded.
                    </p>
                    <p className="mt-1 text-xs text-amber-500">
                      This is a mock transaction for demonstration.
                    </p>
                  </div>
                </div>
              )}

              {/* Amount summary */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Amount to pay</span>
                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("method")}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={handlePay}>
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Pay {formatCurrency(amount)}
                </Button>
              </div>

              <p className="text-center text-xs text-slate-400">
                <Lock className="mr-1 inline-block h-3 w-3" />
                This is a mock payment — no real charges will be made.
              </p>
            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-blue-100" />
                <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Processing Payment
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Please wait while we process your payment...
                </p>
              </div>
              <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: "70%" }} />
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Success animation */}
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-100 opacity-30" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">
                  Payment Successful!
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your payment has been processed.
                </p>
              </div>

              {/* Receipt summary */}
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    Receipt Summary
                  </span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-medium text-slate-700">
                      {invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-medium text-slate-700">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method</span>
                    <span className="font-medium text-slate-700 capitalize">
                      {method.replace(/_/g, " ")}
                    </span>
                  </div>
                  {transactionId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID</span>
                      <span className="font-mono text-xs font-medium text-slate-700">
                        {transactionId}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-700">
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={handleFinish}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
