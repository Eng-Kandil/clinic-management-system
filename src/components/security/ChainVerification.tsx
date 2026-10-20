"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle,
  XCircle,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChainVerificationProps {
  onVerify?: () => Promise<{
    valid: boolean;
    totalChecked: number;
    brokenAt?: number;
  }>;
}

export default function ChainVerification({ onVerify }: ChainVerificationProps) {
  const [status, setStatus] = useState<
    "idle" | "verifying" | "valid" | "invalid"
  >("idle");
  const [result, setResult] = useState<{
    valid: boolean;
    totalChecked: number;
    brokenAt?: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  const handleVerify = async () => {
    setStatus("verifying");
    setResult(null);
    setProgress(0);

    // Animate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      let verifyResult: { valid: boolean; totalChecked: number; brokenAt?: number };

      if (onVerify) {
        verifyResult = await onVerify();
      } else {
        // Fetch from API
        const res = await fetch("/api/security/stats?verifyChain=true");
        const json = await res.json();
        verifyResult = json.data?.chainIntegrity ?? {
          valid: true,
          totalChecked: 0,
        };
      }

      clearInterval(interval);
      setProgress(100);

      // Small delay for visual satisfaction
      await new Promise((resolve) => setTimeout(resolve, 500));

      setResult(verifyResult);
      setStatus(verifyResult.valid ? "valid" : "invalid");
    } catch {
      clearInterval(interval);
      setStatus("invalid");
      setResult({ valid: false, totalChecked: 0 });
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-200">
          Audit Chain Integrity
        </h3>
      </div>

      <p className="text-sm text-slate-400 mb-5">
        Verify that the SHA-256 hash chain linking all audit log entries has not
        been tampered with. Each entry&apos;s hash depends on the previous entry,
        forming a tamper-evident chain.
      </p>

      {/* Status display */}
      {status === "idle" && (
        <div className="flex flex-col items-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80 ring-2 ring-slate-700/50">
            <ShieldCheck className="h-8 w-8 text-slate-400" />
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Click below to verify the integrity of the audit chain
          </p>
          <Button
            onClick={handleVerify}
            className="mt-4 bg-blue-600 hover:bg-blue-700"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verify Chain Integrity
          </Button>
        </div>
      )}

      {status === "verifying" && (
        <div className="flex flex-col items-center py-6">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-blue-400">
            Verifying hash chain...
          </p>
          <div className="mt-3 w-full max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-slate-500">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      )}

      {status === "valid" && result && (
        <div className="flex flex-col items-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/30">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-emerald-400">
            Chain Integrity Verified
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {result.totalChecked.toLocaleString()} log entries checked — all
            hashes are valid
          </p>
          <div className="mt-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 w-full max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Entries</span>
              <span className="font-mono text-emerald-400">
                {result.totalChecked.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Status</span>
              <span className="font-medium text-emerald-400">
                All Valid
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Chain Breaks</span>
              <span className="font-mono text-emerald-400">0</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Re-verify
          </Button>
        </div>
      )}

      {status === "invalid" && result && (
        <div className="flex flex-col items-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-2 ring-red-500/30">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-red-400">
            Chain Integrity Compromised
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tampering detected — the hash chain is broken
          </p>
          <div className="mt-4 rounded-lg bg-red-500/5 border border-red-500/20 px-4 py-3 w-full max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Entries</span>
              <span className="font-mono text-slate-300">
                {result.totalChecked.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Status</span>
              <span className="font-medium text-red-400">
                Invalid
              </span>
            </div>
            {result.brokenAt !== undefined && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Chain Broken At</span>
                <span className="font-mono text-red-400">
                  Entry #{result.brokenAt}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-400">
              Contact your security administrator immediately
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Re-verify
          </Button>
        </div>
      )}
    </div>
  );
}
