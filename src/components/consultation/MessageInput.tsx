"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Loader2 } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 5000,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = message.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {/* Character count warning */}
      {isNearLimit && (
        <div className="mb-2 flex justify-end">
          <span
            className={`text-xs ${
              charCount >= maxLength ? "text-red-500" : "text-amber-500"
            }`}
          >
            {charCount}/{maxLength}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button (UI only) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-400 hover:text-slate-600"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) {
                setMessage(e.target.value);
              }
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ maxHeight: "160px" }}
          />
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          className="shrink-0 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Hint text */}
      <p className="mt-1.5 text-[10px] text-slate-400">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}
