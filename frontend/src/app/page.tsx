"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CentralVisualizer } from "@/components/CentralVisualizer";
import { LeftTelemetryDeck, RightTelemetryDeck } from "@/components/TelemetryCards";
import { ChatFeed } from "@/components/ChatFeed";
import { CommandDeck } from "@/components/CommandDeck";
import { SystemState, ChatMessage, TelemetryData } from "@/types/hud";
import { fetchHealth, fetchHistory, clearHistoryApi, streamChat, playTts } from "@/lib/api";
import { playTacticalChirp } from "@/components/ChamferedButton";

export default function JarvisCommandCenter() {
  const [systemState, setSystemState] = useState<SystemState>("idle");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    cpu: 28,
    memory: 42,
    neuralLoad: 99.8,
    latency: 24,
    fps: 60,
    tokensPerSec: 68,
    coreTemp: 342.6,
  });

  // Load Initial History & Health
  useEffect(() => {
    async function init() {
      const health = await fetchHealth();
      if (!health) {
        setSystemState("idle");
      }

      const history = await fetchHistory(20);
      if (history.length > 0) {
        setMessages(
          history.map((m: any, idx: number) => ({
            id: `hist-${idx}-${Date.now()}`,
            role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
            content: m.content,
            timestamp: m.ts
              ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "SYNCED",
          }))
        );
      }
    }
    init();
  }, []);

  // Telemetry real-time jitter simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpu: Math.floor(24 + Math.random() * 8),
        memory: Math.floor(40 + Math.random() * 4),
        latency: Math.floor(21 + Math.random() * 6),
        tokensPerSec: Math.floor(64 + Math.random() * 10),
        coreTemp: 342.0 + Math.random() * 1.5,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Send Command Flow
  const handleSend = async (prompt: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSystemState("processing");

    const aiMsgId = `ai-${Date.now()}`;
    let aiContent = "";

    // Create placeholder for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
    ]);

    try {
      await streamChat(
        prompt,
        (delta) => {
          aiContent = delta;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === aiMsgId ? { ...msg, content: delta } : msg))
          );
        },
        (finalText, action) => {
          aiContent = finalText;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, content: finalText, action } : msg
            )
          );
          setSystemState("idle");
          playTts(finalText, voiceEnabled);

          // If action specifies URL, launch in browser
          if (action?.url) {
            try {
              window.open(action.url, "_blank");
            } catch {}
          }
        },
        (action) => {
          // Instant action handler as soon as streamed
          if (action?.url) {
            try {
              window.open(action.url, "_blank");
            } catch {}
          }
        }
      );
    } catch {
      const errorReply = "Command transmission failed: unable to communicate with core neural buffer.";
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? { ...msg, content: errorReply } : msg))
      );
      setSystemState("idle");
    }
  };

  const handleClearMemory = async () => {
    playTacticalChirp(300, 0.1);
    if (!confirm("CONFIRM FLUSH: Wipe all JARVIS neural memory cores?")) return;
    await clearHistoryApi();
    setMessages([]);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-void cyber-grid overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-neon/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cobalt-neon/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="hud-scanlines fixed inset-0 z-10" />

      {/* Top Cockpit Bar */}
      <Header
        systemState={systemState}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        onClearMemory={handleClearMemory}
        latency={telemetry.latency}
      />

      {/* Main HUD Cockpit Grid */}
      <main className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_290px] gap-4 p-4 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Telemetry Deck */}
        <aside className="hidden lg:flex flex-col overflow-y-auto pr-1">
          <LeftTelemetryDeck telemetry={telemetry} />
        </aside>

        {/* Center Main Stage (Visualizer + Chat + Input) */}
        <section className="flex flex-col gap-3 h-full overflow-hidden">
          
          {/* Central Voice Visualizer & Protocols Row */}
          <div className="flex-shrink-0 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl p-2 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
            <CentralVisualizer
              systemState={systemState}
              onCoreClick={() => handleSend("Status report on all primary subsystems, JARVIS.")}
            />

            {/* Chamfered Tactical Shortcut Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2 pb-1">
              <button
                onClick={() => handleSend("Initiate a full tactical diagnostic of all JARVIS subsystems and telemetry.")}
                className="p-2 text-left bg-black/40 border border-cyan-neon/20 hover:border-cyan-neon clip-chamfer-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(0,242,254,0.3)] laser-shimmer"
              >
                <div className="font-mono text-[9px] text-cyan-neon/80">[01] DIAGNOSTIC</div>
                <div className="font-display text-[11px] font-bold text-white">SYSTEM SCAN</div>
              </button>

              <button
                onClick={() => handleSend("What is the current meteorological telemetry for Tokyo, London, and New York?")}
                className="p-2 text-left bg-black/40 border border-emerald-beacon/20 hover:border-emerald-beacon clip-chamfer-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] laser-shimmer"
              >
                <div className="font-mono text-[9px] text-emerald-beacon/80">[02] RADAR</div>
                <div className="font-display text-[11px] font-bold text-white">WEATHER DATA</div>
              </button>

              <button
                onClick={() => handleSend("Calculate the velocity required to escape Earth's gravity in km/h and break down the formula.")}
                className="p-2 text-left bg-black/40 border border-cyan-neon/20 hover:border-cyan-neon clip-chamfer-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(0,242,254,0.3)] laser-shimmer"
              >
                <div className="font-mono text-[9px] text-cyan-neon/80">[03] QUANTUM</div>
                <div className="font-display text-[11px] font-bold text-white">ORBITAL MATH</div>
              </button>

              <button
                onClick={() => handleSend("Search and analyze the latest global breakthroughs in artificial general intelligence and quantum microprocessors.")}
                className="p-2 text-left bg-black/40 border border-amber-alert/20 hover:border-amber-alert clip-chamfer-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] laser-shimmer"
              >
                <div className="font-mono text-[9px] text-amber-alert/80">[04] RECON</div>
                <div className="font-display text-[11px] font-bold text-white">AI RESEARCH</div>
              </button>
            </div>
          </div>

          {/* Central Conversational Chat Feed */}
          <ChatFeed
            messages={messages}
            onSpeak={(text) => playTts(text, voiceEnabled)}
          />

          {/* Bottom Command Input Deck */}
          <div className="flex-shrink-0">
            <CommandDeck
              systemState={systemState}
              onSend={handleSend}
              onStateChange={setSystemState}
            />
          </div>

        </section>

        {/* Right Telemetry Deck */}
        <aside className="hidden lg:flex flex-col overflow-y-auto pl-1">
          <RightTelemetryDeck telemetry={telemetry} />
        </aside>

      </main>
    </div>
  );
}
