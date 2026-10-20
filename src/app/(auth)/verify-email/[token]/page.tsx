"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const token = params?.token as string;

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verify-email/${encodeURIComponent(token)}`,
          { method: "GET" }
        );
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
        };

        if (cancelled) return;

        if (res.ok && json.success) {
          setStatus("success");
          setMessage(json.message ?? "Your email has been verified.");
        } else {
          setStatus("error");
          setMessage(
            json.message ??
              "This verification link is invalid or has expired."
          );
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("An unexpected error occurred while verifying your email.");
      }
    }

    if (token) verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Verifying your email
        </h1>
        <p className="text-sm text-slate-500">
          Please wait while we confirm your verification link...
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Email verified
        </h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
        >
          Continue to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
      <div className="flex justify-center mb-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">
        Verification failed
      </h1>
      <p className="text-sm text-slate-500 mb-6">{message}</p>
      <Link
        href="/login"
        className="text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
      >
        Back to sign in
      </Link>
    </div>
  );
}
