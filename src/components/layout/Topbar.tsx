"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useAvatar } from "@/hooks/useAvatar";
import { useSidebarStore } from "@/stores/sidebar.store";
import { MobileNav } from "@/components/layout/MobileNav";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

// Map pathnames to readable titles
function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Remove "dashboard" prefix
  if (segments[0] === "dashboard") segments.shift();
  if (segments.length === 0) return "Dashboard";

  return segments
    .map((s) =>
      s
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(" / ");
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toggle } = useSidebarStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const avatar = useAvatar();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    // Closing dropdown on pathname change is the intended sync side-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
        {/* Left: Toggle + Title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={toggle}
            className="hidden md:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-semibold text-slate-900">
            {pageTitle}
          </h1>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={user?.name ?? "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-700 leading-tight">
                  {user?.name ?? "User"}
                </p>
                <p className="text-xs text-slate-500 capitalize leading-tight">
                  {user?.role?.replace("_", " ") ?? "Role"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={closeMobileNav} />
    </>
  );
}
