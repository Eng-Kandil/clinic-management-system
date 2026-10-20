"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className = "",
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = controlledValue !== undefined;

  // Sync from parent when controlled
  useEffect(() => {
    if (isControlled) {
      // Syncing internal state with controlled prop is the intended behavior.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalValue(controlledValue);
    }
  }, [controlledValue, isControlled]);

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange("");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded text-slate-400 transition-colors duration-200 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
