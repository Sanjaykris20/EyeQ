"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  HelpCircle, 
  Sparkles, 
  RefreshCw,
  Clock,
  ArrowRight
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function AssistantChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, getToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeScreeningId = searchParams.get("screening_id");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Predefined prompt suggestions
  const suggestions = [
    "What is Diabetic Retinopathy?",
    "Why is my patient's RHI score low?",
    "What should I do next?",
    "Explain Glaucoma disc cupping criteria."
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // Initialize greeting message
    setMessages([
      {
        role: "assistant",
        content: `### Welcome to EyeQ Assist

I am your medical AI consultant. ${
          activeScreeningId 
            ? `I have successfully loaded the telemetry context for screening **${activeScreeningId}**.` 
            : "Ask me clinical details about the 10 retinal diseases, RHI metrics, or diagnostic notes templates."
        }`,
        timestamp: new Date()
      }
    ]);
  }, [user, loading, router, activeScreeningId]);

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;
    
    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/screenings/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question: textToSend,
          screening_id: activeScreeningId || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: Message = {
          role: "assistant",
          content: "**System alert**: Encountered connection issue querying medical assistant engine. Using offline diagnostics fallback.",
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (e) {
      const errorMsg: Message = {
        role: "assistant",
        content: "**System error**: Local server offline. Check FastAPI terminal logs.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Simple Markdown parsing for bullet points and headers inside the chat balloon
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="font-bold text-white text-sm mt-3 mb-1 uppercase tracking-wider">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="font-bold text-white text-base mt-4 mb-2">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("* ") || line.startsWith("- ")) {
        return <li key={idx} className="ml-4 list-disc text-slate-300 my-0.5">{line.substring(2)}</li>;
      }
      if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
        return <li key={idx} className="ml-4 list-decimal text-slate-300 my-0.5">{line.substring(3)}</li>;
      }
      return <p key={idx} className="my-1.5 leading-relaxed text-slate-200">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-screen max-w-5xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-center border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="text-secondary" /> EyeQ Clinical Assistant
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Powered by Llama 3. {activeScreeningId ? `Consulting on patient case: ${activeScreeningId}` : "Ask clinical questions."}
            </p>
          </div>
          {activeScreeningId && (
            <span className="px-2.5 py-1 rounded bg-primary/20 text-secondary border border-primary/30 text-[10px] uppercase font-mono tracking-wider">
              Telemetry Context Active
            </span>
          )}
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 min-h-[300px]">
          {messages.map((msg, idx) => {
            const isBot = msg.role === "assistant";
            return (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[80%] ${isBot ? "self-start" : "self-end flex-row-reverse ml-auto"}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isBot ? "bg-primary/20 text-secondary" : "bg-indigo-600 text-white"
                }`}>
                  {isBot ? <Bot size={16} /> : <UserIcon size={16} />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-xl border text-sm text-slate-100 ${
                  isBot ? "bg-card border-border" : "bg-primary/35 border-primary/40 text-right"
                }`}>
                  {isBot ? (
                    <div>{renderMessageContent(msg.content)}</div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                  <span className="block text-[8px] text-slate-500 mt-2 font-mono uppercase text-right leading-none">
                    {msg.timestamp.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-3 items-center text-muted-foreground text-xs font-mono">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-secondary flex items-center justify-center animate-pulse">
                <Bot size={16} />
              </div>
              <div className="flex items-center gap-1.5 p-3 rounded-lg bg-card border border-border">
                <RefreshCw size={12} className="animate-spin text-secondary" />
                <span>EyeQ Assist is formulating reply...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        {messages.length === 1 && (
          <div className="mb-4">
            <span className="text-[10px] text-slate-500 font-mono uppercase mb-2 block flex items-center gap-1">
              <HelpCircle size={12} /> Suggestive Clinical Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-1.5 rounded-lg bg-card hover:bg-slate-900 border border-border text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  {s} <ArrowRight size={12} className="text-secondary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Input Row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(input)}
            placeholder="Type clinical query here (e.g. Write a diagnosis recommendation for DME)..."
            className="flex-1 px-4 py-3 rounded-lg bg-card border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || sending}
            className="px-4 py-3 rounded-lg bg-primary hover:bg-primary/95 text-white shadow-md glow-blue flex items-center justify-center disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <AssistantChatContent />
    </Suspense>
  );
}
