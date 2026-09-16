"use client";

import React from "react";

interface ChamferedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "amber" | "cobalt" | "glass";
  size?: "sm" | "md" | "lg";
  badge?: string;
  statusLed?: "green" | "cyan" | "amber" | "none";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const playTacticalChirp = (freq = 880, dur = 0.06) => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
};

export const ChamferedButton: React.FC<ChamferedButtonProps> = ({
  variant = "cyan",
  size = "md",
  badge,
  statusLed = "none",
  icon,
  children,
  onClick,
  className = "",
  disabled = false,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playTacticalChirp(variant === "amber" ? 440 : 980);
      onClick?.(e);
    }
  };

  const variantStyles = {
    cyan: "border border-cyan-neon/80 bg-gradient-to-br from-cyan-neon/15 to-void/90 text-cyan-neon hover:text-white shadow-[0_0_16px_rgba(0,242,254,0.35)] hover:shadow-[0_0_24px_rgba(0,242,254,0.75),inset_0_0_12px_rgba(0,242,254,0.3)]",
    amber: "border border-amber-alert/80 bg-gradient-to-br from-amber-alert/15 to-void/90 text-amber-alert hover:text-white shadow-[0_0_16px_rgba(245,158,11,0.35)] hover:shadow-[0_0_24px_rgba(245,158,11,0.75),inset_0_0_12px_rgba(245,158,11,0.3)]",
    cobalt: "border border-cobalt-neon/80 bg-gradient-to-br from-cobalt-neon/20 to-void/90 text-blue-300 hover:text-white shadow-[0_0_16px_rgba(37,99,235,0.4)] hover:shadow-[0_0_24px_rgba(37,99,235,0.75),inset_0_0_12px_rgba(37,99,235,0.3)]",
    glass: "border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-neon hover:border-cyan-neon/50 hover:shadow-[0_0_16px_rgba(0,242,254,0.3)]",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base font-semibold",
  };

  const ledStyles = {
    green: "bg-emerald-beacon shadow-[0_0_10px_#10B981]",
    cyan: "bg-cyan-neon shadow-[0_0_10px_#00F2FE]",
    amber: "bg-amber-alert shadow-[0_0_10px_#F59E0B] animate-beacon-pulse",
    none: "",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center gap-2 
        clip-chamfer font-display tracking-wider uppercase
        transition-all duration-200 transform hover:scale-[1.03] active:scale-[0.98]
        laser-shimmer disabled:opacity-35 disabled:pointer-events-none disabled:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {/* Status LED Beacon */}
      {statusLed !== "none" && (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ledStyles[statusLed]}`} />
      )}

      {/* Icon */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {/* Label */}
      <span>{children}</span>

      {/* Tech Badge */}
      {badge && (
        <span className="ml-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/10 border border-white/15 text-slate-200">
          {badge}
        </span>
      )}
    </button>
  );
};
