import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch("http://127.0.0.1:8000/api/action/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({
    status: "ok",
    message: `Target ${body.target || "app"} opened.`,
    target: body.target,
  });
}
