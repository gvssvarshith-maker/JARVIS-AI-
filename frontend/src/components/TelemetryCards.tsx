"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Shield, Terminal, Zap, Fingerprint, Activity } from "lucide-react";
import { TelemetryData } from "@/types/hud";

interface TelemetryDeckProps {
  telemetry: TelemetryData;
}

export const LeftTelemetryDeck: React.FC<TelemetryDeckProps> = ({ telemetry }) => {
  const gyroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparklineRef = useRef<HTMLCanvasElement | null>(null);

  // Protocols state
  const [protocols, setProtocols] = useState([
    { id: "recon", name: "AUTO_RECON", active: true },
    { id: "stream", name: "DEEP_STREAM", active: true },
    { id: "quantum", name: "QUANTUM_MEM", active: true },
    { id: "oc", name: "OVERCLOCK", active: false },
  ]);

  // 1. Gyroscope Wireframe Animation
  useEffect(() => {
    const canvas = gyroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      angle += 0.02;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineWidth = 1.2;

      // Outer ellipse
      ctx.strokeStyle = "rgba(0, 242, 254, 0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00F2FE";
      ctx.beginPath();
      const rOuterY = Math.max(0.5, Math.abs(50 * Math.cos(angle)));
      ctx.ellipse(0, 0, 50, rOuterY, angle, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ellipse
      ctx.strokeStyle = "rgba(37, 100, 235, 0.82)";
      ctx.shadowColor = "#2563EB";
      ctx.beginPath();
      const rInnerX = Math.max(0.5, Math.abs(36 * Math.sin(angle * 0.8)));
      ctx.ellipse(0, 0, rInnerX, 36, angle * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Center core
      ctx.fillStyle = "#006efe60";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // 2. Real-time Token Sparkline Canvas
  useEffect(() => {
    const canvas = sparklineRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const history: number[] = Array.from({ length: 24 }, () => 40 + Math.random() * 30);
    let animId: number;

    const interval = setInterval(() => {
      history.shift();
      history.push(telemetry.tokensPerSec + (Math.random() * 8 - 4));
    }, 400);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const step = w / (history.length - 1);

      ctx.beginPath();
      ctx.strokeStyle = "#00F2FE";
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#00F2FE";

      history.forEach((val, i) => {
        const norm = Math.max(0, Math.min(100, val)) / 100;
        const y = h - norm * (h - 6) - 3;
        const x = i * step;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
    };
  }, [telemetry.tokensPerSec]);

  const toggleProtocol = (id: string) => {
    setProtocols((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Card 1: System Diagnostics / Arc Core */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-neon tracking-wider">
            <Zap className="w-3.5 h-3.5 text-cyan-neon" />
            ARC CORE TELEMETRY
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-alert/15 text-amber-alert border border-amber-alert/30 rounded">
            NOMINAL
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <canvas ref={gyroCanvasRef} width={120} height={85} className="w-[120px] h-[85px]" />
          <div className="flex flex-col gap-1 text-[11px] font-mono text-slate-300">
            <div>CORE: <strong className="text-cyan-neon">{telemetry.coreTemp.toFixed(1)}°K</strong></div>
            <div>POWER: <strong className="text-cyan-neon">100.0%</strong></div>
            <div>FLUX: <strong className="text-emerald-beacon">STABLE</strong></div>
          </div>
        </div>
      </div>

      {/* Card 2: Token Stream & Latency */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-neon tracking-wider">
            <Activity className="w-3.5 h-3.5 text-cyan-neon" />
            TOKEN STREAM
          </span>
          <span className="text-[10px] font-mono text-slate-400">FP16 ENGINE</span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between font-mono text-[11px] text-slate-300 mb-1">
            <span>RATE: <strong className="text-cyan-neon">{telemetry.tokensPerSec} tok/s</strong></span>
            <span>PING: <strong className="text-emerald-beacon">{telemetry.latency}ms</strong></span>
          </div>
          <canvas ref={sparklineRef} width={240} height={42} className="w-full h-[42px] bg-black/40 border border-white/5 rounded" />
        </div>
      </div>

      {/* Card 3: System Protocols */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-neon tracking-wider">
            <Shield className="w-3.5 h-3.5 text-cyan-neon" />
            PROTOCOLS
          </span>
          <span className="text-[10px] font-mono text-cyan-neon/60">SEC_LVL 10</span>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {protocols.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="font-display text-[11px] font-semibold text-slate-300">{p.name}</span>
              <button
                onClick={() => toggleProtocol(p.id)}
                className={`relative w-9 h-4 rounded-full transition-colors border ${
                  p.active
                    ? p.id === "oc"
                      ? "bg-amber-alert/30 border-amber-alert shadow-[0_0_8px_#F59E0B]"
                      : "bg-cyan-neon/30 border-cyan-neon shadow-[0_0_8px_#00F2FE]"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
                    p.active
                      ? p.id === "oc"
                        ? "translate-x-5 bg-amber-alert shadow-[0_0_6px_#F59E0B]"
                        : "translate-x-5 bg-cyan-neon shadow-[0_0_6px_#00F2FE]"
                      : "translate-x-0.5 bg-slate-400"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const RightTelemetryDeck: React.FC<TelemetryDeckProps> = ({ telemetry }) => {
  const [bioScanned, setBioScanned] = useState(false);
  const [hexAddress, setHexAddress] = useState("0x7FFE_A400");

  useEffect(() => {
    const interval = setInterval(() => {
      const rand = "0x" + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, "0");
      setHexAddress(`${rand}_${Math.floor(Math.random() * 9000 + 1000)}`);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleBiometricClick = () => {
    setBioScanned(true);
    setTimeout(() => setBioScanned(false), 3000);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Card 4: Biometric Authorization */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-neon tracking-wider">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-neon" />
            BIOMETRICS
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
            bioScanned ? "bg-emerald-beacon/20 text-emerald-beacon border border-emerald-beacon/40" : "bg-cyan-neon/15 text-cyan-neon border border-cyan-neon/30"
          }`}>
            {bioScanned ? "VERIFIED: STARK" : "READY"}
          </span>
        </div>
        <div
          onClick={handleBiometricClick}
          className="relative flex flex-col items-center justify-center p-3 mt-2 bg-black/40 border border-dashed border-cyan-neon/30 rounded cursor-pointer group hover:border-cyan-neon hover:shadow-[0_0_15px_rgba(0,242,254,0.2)] transition-all"
        >
          <Fingerprint className={`w-10 h-10 transition-colors ${bioScanned ? "text-emerald-beacon" : "text-cyan-neon group-hover:scale-105"}`} />
          <span className="mt-1 font-mono text-[10px] text-slate-400">
            {bioScanned ? "CLEARANCE LEVEL 10" : "CLICK TO SCAN BIOMETRIC"}
          </span>
        </div>
      </div>

      {/* Card 5: CPU, Memory & Neural Load */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="font-display text-xs font-bold text-cyan-neon tracking-wider">
            TACTICAL LOADS
          </span>
          <span className="text-[10px] font-mono text-slate-400">3.4 GHz</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <div>
            <svg className="w-12 h-12 mx-auto" viewBox="0 0 36 36">
              <path className="fill-none stroke-white/10 stroke-[3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path className="fill-none stroke-cyan-neon stroke-[3] stroke-linecap-round" strokeDasharray={`${telemetry.cpu}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div className="font-display text-xs font-bold text-white mt-1">{telemetry.cpu}%</div>
            <div className="font-mono text-[9px] text-slate-400">CPU</div>
          </div>
          <div>
            <svg className="w-12 h-12 mx-auto" viewBox="0 0 36 36">
              <path className="fill-none stroke-white/10 stroke-[3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path className="fill-none stroke-cobalt-neon stroke-[3] stroke-linecap-round" strokeDasharray={`${telemetry.memory}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div className="font-display text-xs font-bold text-white mt-1">{telemetry.memory}%</div>
            <div className="font-mono text-[9px] text-slate-400">RAM</div>
          </div>
          <div>
            <svg className="w-12 h-12 mx-auto" viewBox="0 0 36 36">
              <path className="fill-none stroke-white/10 stroke-[3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path className="fill-none stroke-amber-alert stroke-[3] stroke-linecap-round" strokeDasharray="99, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div className="font-display text-xs font-bold text-white mt-1">99.8%</div>
            <div className="font-mono text-[9px] text-slate-400">NEURAL</div>
          </div>
        </div>
      </div>

      {/* Card 6: Context Memory Buffer */}
      <div className="relative p-3.5 bg-surface-card border border-cyan-neon/20 clip-chamfer backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-neon/15">
          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-cyan-neon tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-cyan-neon" />
            CONTEXT BUFFER
          </span>
          <span className="text-[10px] font-mono text-emerald-beacon">SYNCED</span>
        </div>
        <div className="flex flex-col gap-1 mt-2 font-mono text-[10.5px] text-slate-400">
          <div>REGISTER: <strong className="text-cyan-neon">{hexAddress}</strong></div>
          <div>STORE: <strong>SQLite &bull; jarvis.db</strong></div>
          <div>DUPLEX: <strong className="text-emerald-beacon">STREAM_ACTIVE</strong></div>
        </div>
      </div>
    </div>
  );
};
