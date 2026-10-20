"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  ShieldCheck,
  Smartphone,
  Trash2,
  Monitor,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { toast } from "@/hooks/useToast";

// ─── Schema ──────────────────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Must contain uppercase, lowercase, and a number"
      ),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

interface SessionInfo {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

const activeSessions: SessionInfo[] = [];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SecuritySettings() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // ── Change password ─────────────────────────────────────────────────

  const onChangePassword = async (data: ChangePasswordData) => {
    setChangingPassword(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();

      if (json.success) {
        reset();
        toast({
          type: "success",
          title: "Password changed",
          description: "Your password has been updated successfully.",
        });
      } else {
        toast({
          type: "error",
          title: "Failed to change password",
          description: json.message || "Please check your current password.",
        });
      }
    } catch {
      toast({
        type: "error",
        title: "Network error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Delete account (mock) ───────────────────────────────────────────

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    // Simulate delay
    await new Promise((r) => setTimeout(r, 1500));
    setDeletingAccount(false);
    setDeleteDialogOpen(false);
    toast({
      type: "info",
      title: "Account deletion",
      description:
        "Account deletion is not available in this demo. Contact support for assistance.",
    });
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Change Password ──────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Change Password
          </h3>
        </div>

        <form
          onSubmit={handleSubmit(onChangePassword)}
          className="max-w-md space-y-4"
        >
          <Input
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword")}
          />
          <Button type="submit" loading={changingPassword}>
            {changingPassword ? (
              "Updating..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </section>

      <hr className="border-slate-200" />

      {/* ── Two-Factor Authentication ────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Two-Factor Authentication
          </h3>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Smartphone className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Authenticator App
              </p>
              <p className="text-xs text-slate-500">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Coming Soon
            </span>
            <button
              type="button"
              disabled
              className="relative inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-slate-300 transition-colors"
            >
              <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition-transform" />
            </button>
          </div>
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* ── Active Sessions ──────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Active Sessions
          </h3>
        </div>

        <div className="space-y-3">
          {activeSessions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No active sessions to display.
            </div>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <Monitor className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {session.device}
                      {session.isCurrent && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Current
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{session.ip}</span>
                      <span>&middot;</span>
                      <Clock className="h-3 w-3" />
                      <span>{session.lastActive}</span>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button variant="outline" size="sm">
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* ── Delete Account ───────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-red-600">
            Danger Zone
          </h3>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">
                Delete your account
              </p>
              <p className="text-xs text-red-700">
                Permanently remove your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </div>
      </section>

      {/* ── Delete Confirm Dialog ────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account"
        description="Are you sure you want to delete your account? All your data including appointments, medical records, and prescriptions will be permanently removed. This action cannot be undone."
        confirmLabel="Delete My Account"
        variant="danger"
        onConfirm={handleDeleteAccount}
        loading={deletingAccount}
      />
    </div>
  );
}
