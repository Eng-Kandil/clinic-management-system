"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useAvatar } from "@/hooks/useAvatar";
import { X, LogOut } from "lucide-react";
import { BrandIcon, getNavItemsForRole } from "@/lib/nav/menus";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const avatar = useAvatar();
  const overlayRef = useRef<HTMLDivElement>(null);

  const menuItems = getNavItemsForRole(user?.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 flex-shrink-0">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Go to home"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <BrandIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">ClinicOS</span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-slate-200 p-3 flex-shrink-0">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={user.name ?? "User"}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user.role?.replace("_", " ")}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 200ms ease-out;
        }
      `}</style>
    </div>
  );
}
