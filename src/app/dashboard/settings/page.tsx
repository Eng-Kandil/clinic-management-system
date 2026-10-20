"use client";

import { Settings, User, Shield, Bell, Palette } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import ProfileForm from "@/components/settings/ProfileForm";
import SecuritySettings from "@/components/settings/SecuritySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Tabs
          defaultValue="profile"
          tabs={[
            {
              label: "Profile",
              value: "profile",
              content: (
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Profile Information
                    </h2>
                  </div>
                  <ProfileForm />
                </div>
              ),
            },
            {
              label: "Security",
              value: "security",
              content: (
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Security Settings
                    </h2>
                  </div>
                  <SecuritySettings />
                </div>
              ),
            },
            {
              label: "Notifications",
              value: "notifications",
              content: (
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Notification Preferences
                    </h2>
                  </div>
                  <NotificationSettings />
                </div>
              ),
            },
            {
              label: "Appearance",
              value: "appearance",
              content: (
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Appearance
                    </h2>
                  </div>
                  <AppearanceSettings />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
