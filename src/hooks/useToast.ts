"use client";

import { useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

let globalToastFn: ((options: ToastOptions) => void) | null = null;

/** Fire a toast from anywhere (after ToastProvider mounts). */
export function toast(options: ToastOptions) {
  if (globalToastFn) globalToastFn(options);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).slice(2, 10);
    const newToast: Toast = { id, type: options.type, title: options.title, description: options.description };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss
    const duration = options.duration ?? 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register globally so the standalone `toast()` function works
  useEffect(() => {
    globalToastFn = addToast;
    return () => {
      if (globalToastFn === addToast) globalToastFn = null;
    };
  }, [addToast]);

  return { toasts, toast: addToast, dismiss };
}
