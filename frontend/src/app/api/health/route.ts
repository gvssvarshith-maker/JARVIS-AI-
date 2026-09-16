import { NextResponse } from "next/server";

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const backendRes = await fetch("http://127.0.0.1:8000/api/health", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline fallback
  }

  return NextResponse.json({
    status: "ok",
    assistant: "JARVIS",
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    version: "2.1.0",
    engine: "embedded-neural-link",
  });
}
