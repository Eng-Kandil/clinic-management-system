"use client";

import { useState, useRef, useCallback } from "react";
import { X, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Common symptom suggestions ───────────────────────────────────────────────

const COMMON_SYMPTOMS = [
  "Headache",
  "Fever",
  "Cough",
  "Fatigue",
  "Nausea",
  "Chest pain",
  "Sore throat",
  "Shortness of breath",
  "Dizziness",
  "Back pain",
  "Joint pain",
  "Abdominal pain",
  "Runny nose",
  "Muscle aches",
  "Vomiting",
  "Diarrhea",
  "Skin rash",
  "Insomnia",
  "Loss of appetite",
  "Chills",
  "Swelling",
  "Blurred vision",
  "Ear pain",
  "Palpitations",
];

// ── Component ────────────────────────────────────────────────────────────────

interface SymptomInputProps {
  symptoms: string[];
  onChange: (symptoms: string[]) => void;
  maxSymptoms?: number;
  disabled?: boolean;
}

export default function SymptomInput({
  symptoms,
  onChange,
  maxSymptoms = 20,
  disabled = false,
}: SymptomInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addSymptom = useCallback(
    (symptom: string) => {
      const trimmed = symptom.trim();
      if (!trimmed) return;
      if (symptoms.length >= maxSymptoms) return;

      // Prevent duplicates (case-insensitive)
      const normalized = trimmed.toLowerCase();
      if (symptoms.some((s) => s.toLowerCase() === normalized)) return;

      onChange([...symptoms, trimmed]);
      setInputValue("");
      inputRef.current?.focus();
    },
    [symptoms, onChange, maxSymptoms]
  );

  const removeSymptom = useCallback(
    (index: number) => {
      onChange(symptoms.filter((_, i) => i !== index));
    },
    [symptoms, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSymptom(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && symptoms.length > 0) {
      removeSymptom(symptoms.length - 1);
    }
  };

  // Filter suggestions to exclude already-added ones
  const filteredSuggestions = COMMON_SYMPTOMS.filter(
    (s) =>
      !symptoms.some((added) => added.toLowerCase() === s.toLowerCase()) &&
      (inputValue
        ? s.toLowerCase().includes(inputValue.toLowerCase())
        : true)
  );

  return (
    <div className="space-y-3">
      {/* Input area with chips */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2.5 transition-all",
          isFocused
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-300",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Symptom chips */}
        {symptoms.map((symptom, index) => (
          <span
            key={`${symptom}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {symptom}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymptom(index);
                }}
                className="ml-0.5 rounded-full p-0.5 text-blue-500 transition-colors hover:bg-blue-200 hover:text-blue-700"
                aria-label={`Remove ${symptom}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {/* Text input */}
        {symptoms.length < maxSymptoms && (
          <div className="flex flex-1 items-center gap-1.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                // Add symptom on blur if there's text
                if (inputValue.trim()) {
                  addSymptom(inputValue);
                }
              }}
              placeholder={
                symptoms.length === 0
                  ? "Type a symptom and press Enter..."
                  : "Add more..."
              }
              className="min-w-[120px] flex-1 border-none bg-transparent py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {symptoms.length}/{maxSymptoms} symptoms added
          {symptoms.length === 0 && " — type or click suggestions below"}
        </p>
        {symptoms.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-slate-400 transition-colors hover:text-red-500"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Suggested symptoms */}
      {!disabled && filteredSuggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
            Common symptoms
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.slice(0, 12).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addSymptom(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
              >
                <Plus className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
