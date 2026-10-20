"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useToast, type Toast, type ToastType } from "@/hooks/useToast";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

/* ── Colour & icon map ────────────────────────────────────── */
const toastStyles: Record<ToastType, { wrapper: string; icon: React.ReactNode }> = {
  success: {
    wrapper: "border-green-200 bg-green-50 text-green-900",
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-900",
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-900",
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
};

/* ── Single toast item ────────────────────────────────────── */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const style = toastStyles[toast.type];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all",
        style.wrapper
      )}
      role="alert"
    >
      <div className="shrink-0 pt-0.5">{style.icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Toast container (render once in layout) ──────────────── */
function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export { ToastContainer, ToastItem };
