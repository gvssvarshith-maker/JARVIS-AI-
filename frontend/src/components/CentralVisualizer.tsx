"use client";

import React, { useRef, useEffect } from "react";
import { SystemState } from "@/types/hud";

interface CentralVisualizerProps {
  systemState: SystemState;
  onCoreClick?: () => void;
}

export const CentralVisualizer: React.FC<CentralVisualizerProps> = ({
  systemState,
  onCoreClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Audio Waveform Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      let speed = 0.05;
      let amp = 12;
      let color = "#00F2FE";

      if (systemState === "listening") {
        speed = 0.12;
        amp = 26;
        color = "#00F2FE";
      } else if (systemState === "processing") {
        speed = 0.09;
        amp = 20;
        color = "#F59E0B";
      } else if (systemState === "offline") {
        amp = 2;
        color = "#EF4444";
      }

      phase += speed;

      // Draw Multi-Layer Frequency Waves
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.lineWidth = layer === 0 ? 2 : 1;
        ctx.strokeStyle = layer === 0 ? color : `${color}55`;
        ctx.shadowBlur = layer === 0 ? 12 : 4;
        ctx.shadowColor = color;

        for (let x = 0; x < w; x++) {
          const normX = x / w;
          const envelope = Math.sin(normX * Math.PI); // Windowing envelope so wave tapers at ends
          const y = mid + Math.sin(normX * 8 + phase + layer * 1.2) * amp * envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [systemState]);

  // Visual state mappings
  const coreTheme = {
    idle: {
      ring1: "border-cyan-neon/40 shadow-[0_0_20px_rgba(0,242,254,0.3)]",
      ring2: "border-cobalt-neon/50",
      ring3: "border-cyan-neon/70",
      core: "bg-cyan-neon shadow-[0_0_30px_#00F2FE,0_0_60px_#00F2FE]",
      label: "SYSTEM READY",
    },
    listening: {
      ring1: "border-cyan-neon shadow-[0_0_35px_rgba(0,242,254,0.7)] animate-pulse",
      ring2: "border-emerald-beacon/80",
      ring3: "border-cyan-neon",
      core: "bg-white shadow-[0_0_40px_#00F2FE,0_0_80px_#00F2FE]",
      label: "LISTENING TO VOICE STREAM...",
    },
    processing: {
      ring1: "border-amber-alert/60 shadow-[0_0_30px_rgba(245,158,11,0.5)]",
      ring2: "border-amber-alert/80",
      ring3: "border-amber-alert",
      core: "bg-amber-alert shadow-[0_0_40px_#F59E0B,0_0_80px_#F59E0B]",
      label: "NEURAL SYNTHESIS IN PROGRESS...",
    },
    offline: {
      ring1: "border-red-500/30",
      ring2: "border-red-500/40",
      ring3: "border-red-500/50",
      core: "bg-red-500 shadow-[0_0_20px_#EF4444]",
      label: "DISCONNECTED FROM CORE",
    },
  }[systemState];

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Visualizer Frame & Concentric Spinning Rings */}
      <div 
        onClick={onCoreClick}
        className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center cursor-pointer group"
        title="Interactive Arc Reactor Core"
      >
        {/* Ring 1 - Outermost Segmented Wireframe */}
        <div className={`absolute inset-0 rounded-full border-2 ${coreTheme.ring1} animate-spin-slow transition-colors duration-500`}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-neon rounded-full shadow-[0_0_10px_#00F2FE]" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-neon rounded-full shadow-[0_0_10px_#00F2FE]" />
        </div>

        {/* Ring 2 - Counter-rotating Concentric Orbit */}
        <div className={`absolute inset-4 rounded-full border border-dashed ${coreTheme.ring2} animate-spin-reverse transition-colors duration-500`}>
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-cobalt-neon rounded-full shadow-[0_0_8px_#2563EB]" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-cobalt-neon rounded-full shadow-[0_0_8px_#2563EB]" />
        </div>

        {/* Ring 3 - Inner Segmented Reactor Cage */}
        <div className={`absolute inset-8 rounded-full border-2 border-t-transparent border-b-transparent ${coreTheme.ring3} animate-spin transition-colors duration-500`} />

        {/* Ring 4 - Ultra-close Core Reticle */}
        <div className="absolute inset-12 rounded-full border border-white/20" />

        {/* Pulsing Central Energy Core */}
        <div className="relative z-10 flex items-center justify-center">
          <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full ${coreTheme.core} transition-all duration-300 transform group-hover:scale-110`} />
          <div className="absolute w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#FFFFFF]" />
        </div>
      </div>

      {/* Active Frequency Audio Waveform Canvas */}
      <div className="relative w-full max-w-sm mt-3 h-10 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={40}
          className="w-full h-full"
        />
      </div>

      {/* State Label */}
      <div className="mt-1 font-mono text-[11px] tracking-widest text-slate-400 flex items-center gap-2">
        <span className="text-cyan-neon/60">[STATE]</span>
        <span className="font-semibold text-slate-200">{coreTheme.label}</span>
      </div>
    </div>
  );
};
