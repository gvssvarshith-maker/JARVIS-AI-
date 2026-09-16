"use client";

import React, { useRef, useEffect } from "react";
import { Copy, Volume2, Check, ExternalLink } from "lucide-react";
import { ChatMessage } from "@/types/hud";

interface ChatFeedProps {
  messages: ChatMessage[];
  onSpeak: (text: string) => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ messages, onSpeak }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const renderContent = (content: string) => {
    // Simple markdown formatting: code blocks, inline code, bold, lists
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeLines = part.slice(3, -3).trim().split("\n");
        const lang = codeLines[0].match(/^[a-zA-Z0-9_-]+$/) ? codeLines.shift() : "CODE";
        const codeText = codeLines.join("\n");

        return (
          <div key={index} className="my-2 bg-[#020611] border border-cyan-neon/25 rounded overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1 bg-cyan-neon/10 border-b border-cyan-neon/20 font-mono text-[11px] text-cyan-neon">
              <span>// {lang?.toUpperCase()}</span>
              <button
                onClick={() => handleCopy(`code-${index}`, codeText)}
                className="hover:text-white flex items-center gap-1"
              >
                {copiedId === `code-${index}` ? <Check className="w-3 h-3 text-emerald-beacon" /> : <Copy className="w-3 h-3" />}
                {copiedId === `code-${index}` ? "COPIED" : "COPY"}
              </button>
            </div>
            <pre className="p-3 font-mono text-xs text-blue-300 overflow-x-auto">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Format bold text and linebreaks
      const lines = part.split("\n").filter(Boolean);
      return lines.map((line, lineIdx) => {
        const boldParsed = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
        const inlineCodeParsed = boldParsed.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 font-mono text-xs bg-cyan-neon/10 text-cyan-neon border border-cyan-neon/20 rounded">$1</code>');

        return (
          <p
            key={`${index}-${lineIdx}`}
            className="mb-1.5 last:mb-0 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlineCodeParsed }}
          />
        );
      });
    });
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3 bg-black/40 border border-cyan-neon/15 clip-chamfer"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center my-auto py-8 text-center text-slate-500">
          <div className="font-display text-sm tracking-widest text-cyan-neon/80">
            TRANSMISSION BUFFER EMPTY
          </div>
          <p className="font-mono text-xs mt-1 text-slate-400">
            Awaiting input or trigger from command deck.
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3.5 clip-chamfer font-sans ${
                  isUser
                    ? "bg-gradient-to-br from-cobalt-neon/25 to-void border border-cobalt-neon/60 text-white shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
                    : "bg-surface-card border border-cyan-neon/35 text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(0,242,254,0.08)]"
                }`}
              >
                {/* Content */}
                <div>{renderContent(msg.content)}</div>

                {/* Executed Action Badge */}
                {msg.action && (
                  <div className="mt-3 p-3 bg-void/80 border border-cyan-neon/50 clip-chamfer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-beacon animate-ping" />
                      <div>
                        <div className="font-mono text-[11px] text-cyan-neon font-bold tracking-wider">
                          // TACTICAL PROTOCOL: {(msg.action.target || msg.action.type).toUpperCase()}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {msg.action.dest || msg.action.url || "Command initiated on local system"}
                        </div>
                      </div>
                    </div>
                    {msg.action.url ? (
                      <a
                        href={msg.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-cyan-neon/20 hover:bg-cyan-neon/30 text-cyan-neon border border-cyan-neon text-xs font-mono tracking-wider clip-chamfer transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.35)]"
                      >
                        <span>LAUNCH DESTINATION</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-beacon/20 text-emerald-beacon border border-emerald-beacon/40 text-[10px] font-mono tracking-wider clip-chamfer">
                        [ACTIVE ON HOST OS]
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 font-mono text-[10px] text-slate-500">
                  <span>{isUser ? "TRANSMISSION" : "J.A.R.V.I.S."} // {msg.timestamp}</span>
                  {!isUser && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-cyan-neon flex items-center gap-1 transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-beacon" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? "COPIED" : "COPY"}</span>
                      </button>
                      <button
                        onClick={() => onSpeak(msg.content)}
                        className="hover:text-cyan-neon flex items-center gap-1 transition-colors"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>VOCAL</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
