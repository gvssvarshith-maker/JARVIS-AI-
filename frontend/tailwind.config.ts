import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#02040a",
        surface: "rgba(6, 12, 26, 0.75)",
        "surface-card": "rgba(8, 16, 36, 0.85)",
        "cyan-neon": "#00F2FE",
        "cyan-dim": "rgba(0, 242, 254, 0.16)",
        "cobalt-neon": "#2563EB",
        "amber-alert": "#F59E0B",
        "emerald-beacon": "#10B981",
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "Orbitron", "sans-serif"],
        tech: ["var(--font-rajdhani)", "Rajdhani", "sans-serif"],
        mono: ["var(--font-share-tech-mono)", "Share Tech Mono", "monospace"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      boxShadow: {
        bloom: "0 0 20px rgba(0, 242, 254, 0.4)",
        "bloom-intense": "0 0 30px rgba(0, 242, 254, 0.75), inset 0 0 14px rgba(0, 242, 254, 0.3)",
        "amber-bloom": "0 0 20px rgba(245, 158, 11, 0.45)",
      },
      animation: {
        "spin-slow": "spin 16s linear infinite",
        "spin-reverse": "spin-reverse 10s linear infinite",
        "beacon-pulse": "beaconPulse 1.4s infinite alternate",
        "laser-sweep": "laserSweep 2s ease-in-out infinite",
      },
      keyframes: {
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        beaconPulse: {
          "0%": { opacity: "0.35", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1.15)" },
        },
        laserSweep: {
          "0%": { left: "-100%" },
          "100%": { left: "200%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
