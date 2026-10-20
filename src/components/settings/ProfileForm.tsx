"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Camera, Loader2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/hooks/useToast";

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  phone: z
    .string()
    .max(20, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Read an image file and re-encode it to a small, square-ish JPEG data URL so it
 * can be stored directly in the database (no object storage configured). Keeps
 * the longest edge at `max` px to bound the payload (~tens of KB).
 */
async function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = sourceUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfileForm() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Avatar upload / remove ──────────────────────────────────────────

  const saveAvatar = async (avatarUrl: string) => {
    const res = await fetch("/api/user/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Update failed");
    // Let the topbar (and any other listeners) reflect the new photo immediately.
    window.dispatchEvent(
      new CustomEvent("avatar:updated", { detail: { avatar: avatarUrl } })
    );
  };

  const handleAvatarSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ type: "error", title: "Not an image", description: "Please choose an image file." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ type: "error", title: "Image too large", description: "Maximum file size is 8MB." });
      return;
    }
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 256);
      await saveAvatar(dataUrl);
      setUser((prev) => (prev ? { ...prev, avatar: dataUrl } : prev));
      toast({ type: "success", title: "Photo updated", description: "Your profile photo has been saved." });
    } catch (err) {
      toast({
        type: "error",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not update photo.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await saveAvatar("");
      setUser((prev) => (prev ? { ...prev, avatar: "" } : prev));
      toast({ type: "success", title: "Photo removed" });
    } catch (err) {
      toast({
        type: "error",
        title: "Could not remove photo",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // ── Fetch current user ──────────────────────────────────────────────

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me");
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
          reset({
            name: json.data.name || "",
            phone: json.data.phone || "",
          });
        }
      } catch {
        toast({
          type: "error",
          title: "Failed to load profile",
          description: "Please try refreshing the page.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [reset]);

  // ── Save profile ────────────────────────────────────────────────────

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        setUser(json.data);
        reset({
          name: json.data.name || "",
          phone: json.data.phone || "",
        });
        toast({
          type: "success",
          title: "Profile updated",
          description: "Your profile has been saved successfully.",
        });
      } else {
        toast({
          type: "error",
          title: "Update failed",
          description: json.message || "Could not update profile.",
        });
      }
    } catch {
      toast({
        type: "error",
        title: "Network error",
        description: "Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Initials helper ─────────────────────────────────────────────────

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Avatar section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600 ring-2 ring-slate-200">
              {user?.name ? getInitials(user.name) : <User className="h-8 w-8" />}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            title="Change profile photo"
          >
            {uploadingAvatar ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {user?.name || "User"}
          </h3>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <p className="mt-0.5 text-xs capitalize text-slate-400">
            {user?.role?.replace("_", " ")}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
            >
              {user?.avatar ? "Change photo" : "Upload photo"}
            </button>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-60"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email Address"
            type="email"
            value={user?.email || ""}
            disabled
            className="bg-slate-50 text-slate-500"
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 000-0000"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Select
            label="Role"
            options={[
              { label: "Patient", value: "patient" },
              { label: "Doctor", value: "doctor" },
              { label: "Admin", value: "admin" },
              { label: "Security Officer", value: "security_officer" },
            ]}
            value={user?.role || "patient"}
            disabled
            className="bg-slate-50 text-slate-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                reset({
                  name: user?.name || "",
                  phone: user?.phone || "",
                })
              }
            >
              Discard
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
