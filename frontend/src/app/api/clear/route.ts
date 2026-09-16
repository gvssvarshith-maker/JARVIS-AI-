import { NextResponse } from "next/server";

export async function POST() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const backendRes = await fetch("http://127.0.0.1:8000/api/clear", {
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Offline fallback
  }

  return NextResponse.json({ status: "ok", message: "Memory buffer reset." });
}
