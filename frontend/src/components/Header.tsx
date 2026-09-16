"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Trash2, Cpu, Activity } from "lucide-react";
import { ChamferedButton } from "./ChamferedButton";
import { SystemState } from "@/types/hud";

interface HeaderProps {
  systemState: SystemState;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onClearMemory: () => void;
  latency: number;
}

export const Header: React.FC<HeaderProps> = ({
  systemState,
  voiceEnabled,
  onToggleVoice,
  onClearMemory,
  latency,
}) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toUTCString().split(" ")[4] + " UTC");
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const stateBadges: Record<SystemState, { text: string; color: string; led: "green" | "cyan" | "amber" }> = {
    idle: { text: "STANDBY // READY", color: "text-emerald-beacon", led: "green" },
    listening: { text: "VOICE STREAM // ENGAGED", color: "text-cyan-neon", led: "cyan" },
    processing: { text: "NEURAL CORE // PROCESSING", color: "text-amber-alert", led: "amber" },
    offline: { text: "LINK SEVERED", color: "text-red-500", led: "amber" },
  };

  const currentBadge = stateBadges[systemState] || stateBadges.idle;

  return (
    <header className="relative z-30 flex items-center justify-between h-16 px-6 bg-void/90 backdrop-blur-xl border-b border-cyan-neon/20 shadow-[0_4px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(0,242,254,0.06)]">
      {/* Left: Stark Crest & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-8 border-l-2 border-t-2 border-b-2 border-cyan-neon" />
          <div className="px-2 py-0.5 bg-cyan-neon/10 rounded-sm">
            <span className="font-display font-black text-xs text-cyan-neon tracking-widest">
              MK-85
            </span>
          </div>
          <div className="w-1.5 h-8 border-r-2 border-t-2 border-b-2 border-cyan-neon" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-xl tracking-widest text-white drop-shadow-[0_0_12px_rgba(0,242,254,0.6)]">
              J.A.R.V.I.S.
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-neon/10 text-cyan-neon border border-cyan-neon/30 rounded">
              GEMINI 3.6 FLASH
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>SYS_VERSION: <strong>v2.1.0</strong></span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-neon" />
              LATENCY: <strong className="text-cyan-neon">{latency}ms</strong>
            </span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-beacon" />
              FRAME: <strong className="text-emerald-beacon">60 FPS</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Clock & Quick Controls */}
      <div className="flex items-center gap-3">
        {/* State Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-neon/5 border border-cyan-neon/25 rounded-sm font-display text-xs font-bold tracking-wider">
          <span className={`w-2 h-2 rounded-full ${
            currentBadge.led === "green" ? "bg-emerald-beacon shadow-[0_0_8px_#10B981]" :
            currentBadge.led === "cyan" ? "bg-cyan-neon shadow-[0_0_8px_#00F2FE]" :
            "bg-amber-alert shadow-[0_0_8px_#F59E0B] animate-beacon-pulse"
          }`} />
          <span className={currentBadge.color}>{currentBadge.text}</span>
        </div>

        {/* Live Clock */}
        <div className="px-3 py-1.5 font-mono text-sm text-slate-200 bg-black/50 border border-white/10 tracking-widest">
          {time || "00:00:00 UTC"}
        </div>

        {/* Vocal Toggle */}
        <ChamferedButton
          variant={voiceEnabled ? "cyan" : "glass"}
          size="sm"
          statusLed={voiceEnabled ? "green" : "amber"}
          badge={voiceEnabled ? "VOCAL_ON" : "MUTED"}
          icon={voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          onClick={onToggleVoice}
        >
          {voiceEnabled ? "Voice" : "Mute"}
        </ChamferedButton>

        {/* Clear Memory */}
        <ChamferedButton
          variant="amber"
          size="sm"
          statusLed="amber"
          badge="CLEAR"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={onClearMemory}
        >
          Flush Core
        </ChamferedButton>
      </div>
    </header>
  );
};
