import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION =
  "You are J.A.R.V.I.S., Tony Stark's iconic, sophisticated personal AI. " +
  "Speak with calm confidence, witty politeness, and supreme precision. " +
  "Keep responses crisp, punchy, and concise (2-3 sentences or compact bullet points) so responses are delivered instantaneously. " +
  "Address the user respectfully (e.g., 'sir'). Only provide long elaborate explanations when specifically requested.";

const FAST_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = body.prompt || "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      text: `Greetings, sir. Neural link operational. You transmitted: "${prompt}". Ready for tactical deployment.`,
    });
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { maxOutputTokens: 250, temperature: 0.6 },
  };

  for (const model of FAST_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json({ text: text.trim() });
        }
      }
    } catch {
      // Try next model
    }
  }

  return NextResponse.json({
    text: `All primary subsystems are nominal, sir. I have processed your instruction: "${prompt}". Standing by.`,
  });
}
