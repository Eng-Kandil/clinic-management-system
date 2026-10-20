"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { useAvatar } from "@/hooks/useAvatar";
import { useSidebarStore } from "@/stores/sidebar.store";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { BrandIcon, getNavItemsForRole } from "@/lib/nav/menus";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const avatar = useAvatar();
  const { isOpen, toggle } = useSidebarStore();

  const menuItems = getNavItemsForRole(user?.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        hidden md:flex flex-col bg-white border-r border-slate-200
        transition-all duration-200 ease-in-out h-screen relative flex-shrink-0
        ${isOpen ? "w-64" : "w-16"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200 flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Go to home"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
            <BrandIcon className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <span className="text-lg font-bold text-slate-900 truncate">
              ClinicOS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              title={!isOpen ? item.label : undefined}
              className={`
                flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
                ${!isOpen ? "justify-center px-2" : ""}
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
              {isOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Card & Collapse Toggle */}
      <div className="border-t border-slate-200 p-2.5 flex-shrink-0">
        {/* User Info */}
        {user && (
          <div
            className={`
              flex items-center gap-3 px-2.5 py-2 rounded-lg mb-2
              ${!isOpen ? "justify-center px-2" : ""}
            `}
          >
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
            {isOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user.role?.replace("_", " ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={!isOpen ? "Sign out" : undefined}
          className={`
            flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium
            text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150
            ${!isOpen ? "justify-center px-2" : ""}
          `}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span>Sign out</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggle}
          className={`
            flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium
            text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors duration-150 mt-1
            ${!isOpen ? "justify-center px-2" : ""}
          `}
        >
          {isOpen ? (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
