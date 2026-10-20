"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId }),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n").filter(l => l.startsWith("data:"));
        for (const line of lines) {
          const data = JSON.parse(line.slice(5));
          if (data.delta) {
            assistantMsg += data.delta;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
              return updated;
            });
          }
          if (data.sessionId) setSessionId(data.sessionId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 z-50"
        aria-label="Open AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white border rounded-xl shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-xl">
        <span className="font-semibold">AI Health Assistant</span>
        <button onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">Ask me anything about your health or appointments.</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 size={16} className="animate-spin" /></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="text-xs text-gray-400 px-4 py-1 border-t">AI assistant — not a substitute for medical advice</div>
      <div className="p-3 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
