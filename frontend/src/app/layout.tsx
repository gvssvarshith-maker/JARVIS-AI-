import type { Metadata } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono, Inter } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "J.A.R.V.I.S. // AUTONOMOUS AI COMMAND CENTER",
  description: "Next-generation holographic desktop HUD interface for autonomous AI command and control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${shareTechMono.variable} ${inter.variable}`}
    >
      <body className="bg-void text-slate-200 antialiased overflow-hidden select-none font-tech">
        {children}
      </body>
    </html>
  );
}
