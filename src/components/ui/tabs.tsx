"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  label: string;
  value: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
  onChange?: (value: string) => void;
}

function Tabs({ tabs, defaultValue, className, onChange }: TabsProps) {
  const [active, setActive] = React.useState(
    defaultValue || tabs[0]?.value || ""
  );

  function handleChange(value: string) {
    setActive(value);
    onChange?.(value);
  }

  const activeTab = tabs.find((t) => t.value === active);

  return (
    <div className={cn("w-full", className)}>
      {/* Tab list */}
      <div
        role="tablist"
        className="inline-flex w-full border-b border-slate-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => handleChange(tab.value)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active === tab.value
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {active === tab.value && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div role="tabpanel" className="pt-4">
        {activeTab?.content}
      </div>
    </div>
  );
}

export { Tabs };
