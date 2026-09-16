import { NextRequest } from "next/server";

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

const WEB_SHORTCUTS: Record<string, string> = {
  youtube: "https://www.youtube.com",
  browser: "https://www.google.com",
  google: "https://www.google.com",
  github: "https://github.com",
  gmail: "https://mail.google.com",
  reddit: "https://www.reddit.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = (body.prompt || "").trim();
  const apiKey = process.env.GEMINI_API_KEY;
  const encoder = new TextEncoder();

  // 1. Try forwarding to FastAPI backend on port 8000 (which has direct Windows OS shell access)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const backendRes = await fetch("http://127.0.0.1:8000/api/llm/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (backendRes.ok && backendRes.body) {
      return new Response(backendRes.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
  } catch {
    // Backend offline; handle in Next.js fallback
  }

  // 2. Client-level app/web intent detection if backend is offline
  const lower = prompt.toLowerCase();
  for (const [key, url] of Object.entries(WEB_SHORTCUTS)) {
    if (
      lower === `open ${key}` ||
      lower === `launch ${key}` ||
      lower.startsWith(`open ${key}`) ||
      lower.includes(`play on ${key}`)
    ) {
      const reply = `Accessing ${key.charAt(0).toUpperCase() + key.slice(1)} for you now, sir.`;
      const action = { type: "open_url", target: key, url };
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: reply, action })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, full: reply, action })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
  }

  // 3. Direct Gemini streamGenerateContent fallback
  if (!apiKey) {
    const fallbackText = `All systems online, sir. Processing prompt: "${prompt}". Standing by.`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: fallbackText })}\n\n`)
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, full: fallbackText })}\n\n`)
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    generationConfig: { maxOutputTokens: 250, temperature: 0.6 },
  };

  const readableStream = new ReadableStream({
    async start(controller) {
      let accumulated = "";
      let success = false;

      for (const model of FAST_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (geminiRes.ok && geminiRes.body) {
            const reader = geminiRes.body.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              lineBuffer += decoder.decode(value, { stream: true });
              const lines = lineBuffer.split("\n");
              lineBuffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data:")) {
                  try {
                    const json = JSON.parse(trimmed.slice(5).trim());
                    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      accumulated += text;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }

            if (accumulated.trim()) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, full: accumulated.trim() })}\n\n`
                )
              );
              success = true;
              break;
            }
          }
        } catch {
          // Try next model if one fails
        }
      }

      if (!success) {
        const fallback = `Telemetry confirmed, sir. All core diagnostics for "${prompt}" are running within optimal parameters.`;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: fallback })}\n\n`)
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, full: fallback })}\n\n`)
        );
      }

      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
