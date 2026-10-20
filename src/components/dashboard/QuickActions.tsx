"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string; // tailwind bg color class e.g. "bg-blue-600"
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4",
        className
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col items-center gap-3 bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-lg text-white transition-transform duration-200 group-hover:scale-110",
                action.color
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700 text-center group-hover:text-slate-900">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
