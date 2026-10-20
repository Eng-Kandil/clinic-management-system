"use client";

import { useRef, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronUp, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/types";

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  participantName: string;
  currentUserName: string;
  isActive: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function shouldShowDateSeparator(
  current: ChatMessage,
  previous: ChatMessage | undefined
) {
  if (!previous) return true;
  const currentDate = new Date(current.timestamp).toDateString();
  const previousDate = new Date(previous.timestamp).toDateString();
  return currentDate !== previousDate;
}

export default function ChatWindow({
  messages,
  currentUserId,
  participantName,
  currentUserName,
  isActive,
  hasMore,
  loadingMore,
  onLoadMore,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showTyping, setShowTyping] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Simulated typing indicator — shows briefly after receiving a message
  useEffect(() => {
    if (!isActive || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.senderId !== currentUserId) {
      // Hiding indicator in response to incoming message change — intentional sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowTyping(false);
      return;
    }
    // After user sends a message, briefly show typing from other side
    setShowTyping(true);
    const timer = setTimeout(() => setShowTyping(false), 2000);
    return () => clearTimeout(timer);
  }, [messages.length, currentUserId, isActive]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-3"
    >
      {/* Load older messages */}
      {hasMore && (
        <div className="flex justify-center py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronUp className="mr-1.5 h-3 w-3" />
                Load older messages
              </>
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              No messages yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Send a message to start the conversation
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        const isOwn = msg.senderId === currentUserId;
        const showDate = shouldShowDateSeparator(msg, messages[index - 1]);

        return (
          <div key={`${msg.timestamp}-${index}`}>
            {/* Date separator */}
            {showDate && (
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-[11px] font-medium text-slate-400">
                  {formatDateSeparator(msg.timestamp)}
                </span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`mb-2 flex items-end gap-2 ${
                isOwn ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {!isOwn && (
                <Avatar
                  name={participantName}
                  size="sm"
                  className="mb-1 shrink-0"
                />
              )}
              <div
                className={`group relative max-w-[75%] ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-900"
                  }`}
                >
                  {msg.type === "file" && msg.fileUrl ? (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline ${
                        isOwn
                          ? "text-blue-100 hover:text-white"
                          : "text-blue-600 hover:text-blue-800"
                      }`}
                    >
                      {msg.content}
                    </a>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}
                </div>
                <p
                  className={`mt-1 text-[10px] text-slate-400 ${
                    isOwn ? "text-right" : "text-left"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {isOwn && (
                <Avatar
                  name={currentUserName}
                  size="sm"
                  className="mb-1 shrink-0"
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {showTyping && isActive && (
        <div className="mb-2 flex items-end gap-2">
          <Avatar name={participantName} size="sm" className="mb-1 shrink-0" />
          <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
